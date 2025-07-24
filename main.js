import { startQuiz, processAnswer, processNameInput } from './quizLogic.js';

async function handleRequest(request, env) {
  if (request.method === 'POST') {
    const data = await request.json();
    const { message, callback_query } = data;
    if (message && message.text === '/start') {
      return await startQuiz(message.chat.id, env);
    } else if (message && message.text && userData.has(message.from.id) && userData.get(message.from.id).state === 'awaiting_name') {
      return await processNameInput(message, env);
    } else if (callback_query && callback_query.data) {
      return await processAnswer(callback_query, env); // Исправлено
    }
  }
  return new Response('OK', { status: 200 });
}

export default {
  fetch: handleRequest,
};

export const userData = new Map();