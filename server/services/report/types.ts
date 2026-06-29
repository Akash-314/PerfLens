export interface IReportSaveInput {
  url: string;
  metadata: any;
  pagespeed: any;
  puppeteer: any;
  image: any;
  css: any;
  js: any;
  seo: any;
  accessibility: any;
  recommendation: any;
  overallHealthScore: number;
  overallPerformanceGrade: string;
  status: string;
  duration: number;
}
