import {createClient} from '@supabase/supabase-js';
import {createApp} from './app.js';
for (const name of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error('Variável ausente: ' + name);
}
const options = {auth:{autoRefreshToken:false,persistSession:false}};
const app = createApp({
  admin:createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options),
  scopedClient:token=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{
    ...options,global:{headers:{Authorization:'Bearer '+token}}
  }),
  frontendUrl:process.env.FRONTEND_URL
});
app.listen(process.env.PORT||10000,()=>console.log('Linko Obras API na porta '+(process.env.PORT||10000)));
