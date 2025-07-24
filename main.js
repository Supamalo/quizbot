import { startQuiz, processAnswer, processNameInput } from './quizLogic.js';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'POST') {
    const data = await request.json();
    const { message, callback_query } = data;
    if (message && message.text === '/start') {
      return await startQuiz(message.chat.id);
    } else if (message && message.text && userData.has(message.from.id) && userData.get(message.from.id).state === 'awaiting_name') {
      return await processNameInput(message);
    } else if (callback_query && callback_query.data) {
      return await processAnswer(callback_query);
    }
  }
  return new Response('OK', { status: 200 });
}

export const userData = new Map();