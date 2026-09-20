import { Response } from 'express';
import {
  aiService,
  EvidenceGateError,
  AIDisabledError,
  ManagedAiQuotaExceededError,
  ByokNotConfiguredError
} from '../services/ai/ai.service.js';
import { aiConfigService } from '../services/ai/aiConfig.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { decryptSecret, sanitizeLog } from '../services/security/aiEncryption.js';
import { ProviderRouter } from '../services/ai/providerRouter.js';
import { validateUrlForSsrf, validateUrlSsrfAsync } from '../services/security/ssrfValidator.js';
import { SupportedAIProvider } from '../models/userAiConfig.js';

export async function explainFindingController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const startTime = Date.now();
  const { finding, context } = req.body;

  if (!finding) {
    res.status(400).json({
      success: false,
      message: 'Missing finding payload in request body.'
    });
    return;
  }

  try {
    const user = req.user ? { id: req.user.id || (req.user as any)._id } : null;
    const explanation = await aiService.explainFinding(finding, context, user);
    const durationMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: explanation,
      durationMs
    });
  } catch (err: any) {
    if (err instanceof ManagedAiQuotaExceededError) {
      res.status(403).json({
        success: false,
        code: 'MANAGED_AI_QUOTA_EXCEEDED',
        message: err.message,
        usage: {
          used: err.used,
          limit: err.limit,
          period: err.period
        }
      });
      return;
    }

    if (err instanceof ByokNotConfiguredError) {
      res.status(400).json({
        success: false,
        code: 'BYOK_NOT_CONFIGURED',
        message: err.message
      });
      return;
    }

    if (err instanceof AIDisabledError) {
      res.status(200).json({
        success: false,
        status: 'disabled',
        message: 'AI explanation is disabled (PERFLENS_AI_ENABLED=false).'
      });
      return;
    }

    if (err instanceof EvidenceGateError) {
      res.status(422).json({
        success: false,
        message: err.message,
        errorType: 'EVIDENCE_GATE_ERROR'
      });
      return;
    }

    const safeMsg = sanitizeLog(err.message);
    console.error(`[AI Controller Error]: ${safeMsg}`);
    res.status(500).json({
      success: false,
      message: 'AI explanation is temporarily unavailable.'
    });
  }
}

export function getAiStatusController(_req: AuthenticatedRequest, res: Response): void {
  res.status(200).json({
    success: true,
    enabled: aiService.isAIEnabled()
  });
}

export async function getAiConfigController(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.user as any)?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required to view AI configuration.' });
      return;
    }

    const config = await aiConfigService.getUserConfigDto(userId);
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (err: any) {
    const safeMsg = sanitizeLog(err.message);
    res.status(500).json({ success: false, message: `Failed fetching AI configuration: ${safeMsg}` });
  }
}

export async function saveAiConfigController(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.user as any)?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required to save AI configuration.' });
      return;
    }

    const { mode, provider, model, apiKey, baseUrl } = req.body;

    if (mode && !['managed', 'byok'].includes(mode)) {
      res.status(400).json({ success: false, message: 'Invalid mode. Must be "managed" or "byok".' });
      return;
    }

    if (provider && !['managed', 'gemini', 'openai', 'anthropic', 'openai-compatible'].includes(provider)) {
      res.status(400).json({ success: false, message: 'Unsupported AI provider.' });
      return;
    }

    // SSRF Validation for OpenAI-Compatible Base URL
    if (provider === 'openai-compatible' && baseUrl) {
      if (!validateUrlForSsrf(baseUrl)) {
        res.status(400).json({
          success: false,
          code: 'SSRF_BLOCKED',
          message: 'Base URL contains a restricted host or private IP address.'
        });
        return;
      }

      const ssrfCheck = await validateUrlSsrfAsync(baseUrl);
      if (!ssrfCheck.safe) {
        res.status(400).json({
          success: false,
          code: 'SSRF_BLOCKED',
          message: ssrfCheck.reason || 'Restricted target host rejected for security reasons.'
        });
        return;
      }
    }

    const saved = await aiConfigService.saveUserConfig(userId, {
      mode: mode || 'managed',
      provider,
      model,
      apiKey,
      baseUrl
    });

    res.status(200).json({
      success: true,
      message: 'AI configuration saved successfully.',
      data: saved
    });
  } catch (err: any) {
    const safeMsg = sanitizeLog(err.message);
    res.status(500).json({ success: false, message: `Failed saving AI configuration: ${safeMsg}` });
  }
}

export async function deleteAiKeyController(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.user as any)?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const updated = await aiConfigService.removeUserApiKey(userId);
    res.status(200).json({
      success: true,
      message: 'API key removed successfully.',
      data: updated
    });
  } catch (err: any) {
    const safeMsg = sanitizeLog(err.message);
    res.status(500).json({ success: false, message: `Failed removing API key: ${safeMsg}` });
  }
}

export async function testAiConnectionController(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.user as any)?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { provider = 'gemini', model, apiKey, baseUrl } = req.body;

    let keyToTest = apiKey?.trim();

    // If key not provided in body, load from user's encrypted configuration
    if (!keyToTest) {
      const rawConfig = await aiConfigService.getRawUserConfig(userId);
      if (rawConfig?.encryptedApiKey) {
        try {
          keyToTest = decryptSecret(rawConfig.encryptedApiKey);
        } catch {
          res.status(400).json({ success: false, code: 'AUTH_ERROR', message: 'Stored API key is corrupted.' });
          return;
        }
      }
    }

    // SSRF Validation if testing OpenAI-compatible
    if (provider === 'openai-compatible' && baseUrl) {
      if (!validateUrlForSsrf(baseUrl)) {
        res.status(400).json({
          success: false,
          code: 'SSRF_BLOCKED',
          message: 'Base URL contains a restricted host or private IP address.'
        });
        return;
      }
      const ssrfCheck = await validateUrlSsrfAsync(baseUrl);
      if (!ssrfCheck.safe) {
        res.status(400).json({
          success: false,
          code: 'SSRF_BLOCKED',
          message: ssrfCheck.reason || 'Restricted target host rejected for security reasons.'
        });
        return;
      }
    }

    const tempConfig = {
      userId,
      mode: 'byok' as const,
      provider: provider as SupportedAIProvider,
      model: model || 'default',
      baseUrl
    };

    const providerInstance = ProviderRouter.resolveProvider(tempConfig, keyToTest);

    if (!providerInstance.testConnection) {
      res.status(200).json({ success: true, message: 'Provider connection ready.' });
      return;
    }

    const result = await providerInstance.testConnection();
    res.status(200).json(result);
  } catch (err: any) {
    const safeMsg = sanitizeLog(err.message);
    res.status(200).json({
      success: false,
      code: 'NETWORK_ERROR',
      message: safeMsg || 'Connection test failed.'
    });
  }
}
