import 'dotenv/config';
import { mastra } from './src/mastra/index.js';

async function runGreetingAgent() {
  try {
    const greetingAgent = mastra.getAgent('greetingAgent');
    
    const now = new Date();
    const hours = now.getHours();
    const timeString = `${hours}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    console.log(`\n現在時刻: ${timeString}`);
    console.log('挨拶エージェントを実行中...\n');
    
    const result = await greetingAgent.text({
      messages: [
        {
          role: 'user',
          content: '今の時間帯に合った挨拶をお願いします。'
        }
      ]
    });
    
    console.log('エージェントの応答:');
    console.log(result.text);
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

runGreetingAgent();