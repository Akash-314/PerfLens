import { supabase } from './config/supabase.js';

async function main() {
  const { data, error } = await supabase
    .from('reports')
    .select('id, url, status, overall_health_score, overall_performance_grade, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching reports:', error.message);
  } else {
    console.log('Recent Reports in Supabase:', JSON.stringify(data, null, 2));
  }
}

main();
