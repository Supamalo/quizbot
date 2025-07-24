import { sendMessage, sendPhoto, answerCallback } from './telegramApi.js';
import { loadQuizData, loadQuizNames } from './dataLoader.js';
import { userData } from './main.js';

export async function startQuiz(chatId, env) {
  const quizNames = await loadQuizNames();
  const keyboard = {
    inline_keyboard: Object.keys(quizNames).map(quizId => [
      { text: quizNames[quizId], callback_data: `quiz_${quizId}` }
    ])
  };
  await sendMessage(chatId, "Выбери тему квиза, которую хочешь пройти.", keyboard);
  return new Response('OK', { status: 200 });
}

export async function processNameInput(message, env) {
  const { from: { id: userId }, text, chat: { id: chatId } } = message;
  const user = userData.get(userId);
  if (!user || user.state !== 'awaiting_name') {
    await sendMessage(chatId, "Пожалуйста, начните квиз заново с помощью /start.");
    return new Response('OK', { status: 200 });
  }

  const nameParts = text.trim().split(/\s+/);
  if (nameParts.length < 2) {
    await sendMessage(chatId, "Пожалуйста, укажите имя и фамилию через пробел (например: Иван Иванов).");
    return new Response('OK', { status: 200 });
  }

  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  userData.set(userId, {
    ...user,
    firstName,
    lastName,
    username: message.from.username || '',
    state: 'quiz_started',
    currentQuestion: 0,
    score: 0,
    answers: [],
    quizStartedAt: Date.now() // время начала квиза
  });
  await sendQuestion(chatId, userData.get(userId), user.quizId, env, userId);
  return new Response('OK', { status: 200 });
}

export async function processAnswer(callbackQuery, env) {
  const { id: callbackId, from: { id: userId }, data, message } = callbackQuery;
  const chatId = message.chat.id;

  const user = userData.get(userId);
  if (!user || user.state !== 'quiz_started') {
    await sendMessage(chatId, "Пожалуйста, начните квиз заново с помощью /start.");
    await answerCallback(callbackId);
    return new Response('OK', { status: 200 });
  }

  if (data.startsWith("quiz_")) {
    const quizId = data.replace("quiz_", "");
    const quizzes = await loadQuizData(env);
    if (!quizzes[quizId]) {
      await sendMessage(chatId, "Ошибка: выбранная тема квиза недоступна. " + JSON.stringify(quizzes));
      await answerCallback(callbackId);
      return new Response('OK', { status: 200 });
    }
    // Сохраняем quizId и состояние, остальные поля не трогаем
    const prev = userData.get(userId) || {};
    userData.set(userId, {
      ...prev,
      quizId,
      state: 'awaiting_name'
    });
    await sendMessage(chatId, "Пожалуйста, укажите ваше имя и фамилию через пробел (например: Иван Иванов).");
    await answerCallback(callbackId);
    return new Response('OK', { status: 200 });
  }

  const quizzes = await loadQuizData(env);
  const quizId = user.quizId;
  const currentQuestion = user.currentQuestion;
  const questionData = quizzes[quizId]?.[currentQuestion];

  if (!questionData) {
    const timestamp = Date.now();
    const score = user.score;
    const total = quizzes[quizId].length;
    const quizNames = await loadQuizNames();
    const quizName = quizNames[quizId] || quizId;
    const messageText = `Квиз пройден: ${user.firstName} ${user.lastName} (@${user.username || 'Unknown'})\nТема: ${quizName}\nРезультат: ${score} из ${total}\nДата и время: ${new Date(timestamp).toISOString()}`;
    await sendMessage('-1002831579277', messageText);
    await saveQuizResult(userId, quizId, user, timestamp, env);
    const keyboard = {
      inline_keyboard: [
        [{ text: "Попробовать снова?", callback_data: "restart_quiz" }]
      ]
    };
    await sendMessage(chatId, `Квиз завершен! Ваш результат: ${score}/${total}`, keyboard);
    userData.delete(userId);
    await answerCallback(callbackId);
    return new Response('OK', { status: 200 });
  }

  const answerIndex = parseInt(data.split("_")[1]);
  if (isNaN(answerIndex)) {
    await sendMessage(chatId, "Неверный формат ответа, попробуйте снова!");
  } else {
    user.answers.push({
      questionIndex: currentQuestion,
      selectedAnswerIndex: answerIndex,
      correctAnswerIndex: questionData.correct,
      isCorrect: answerIndex === questionData.correct
    });
    if (answerIndex === questionData.correct) {
      await sendMessage(chatId, "Правильно!");
      user.score += 1;
    } else {
      await sendMessage(chatId, "Неправильно!");
    }
    user.currentQuestion += 1;
    if (user.currentQuestion < quizzes[quizId].length) {
      await sendQuestion(chatId, user, quizId, env, userId);
    } else {
      const timestamp = Date.now();
      const score = user.score;
      const total = quizzes[quizId].length;
      const quizNames = await loadQuizNames();
      const quizName = quizNames[quizId] || quizId;
      const messageText = `Квиз пройден: ${user.firstName} ${user.lastName} (@${user.username || 'Unknown'})\nТема: ${quizName}\nРезультат: ${score} из ${total}\nДата и время: ${new Date(timestamp).toISOString()}`;
      await sendMessage('-1002831579277', messageText);
      await saveQuizResult(userId, quizId, user, timestamp, env);
      const keyboard = {
        inline_keyboard: [
          [{ text: "Попробовать снова?", callback_data: "restart_quiz" }]
        ]
      };
      await sendMessage(chatId, `Квиз завершен! Ваш результат: ${score}/${total}`, keyboard);
      userData.delete(userId);
    }
  }

  await answerCallback(callbackId);
  return new Response('OK', { status: 200 });
}

async function sendQuestion(chatId, user, quizId, env, userId) {
  const quizzes = await loadQuizData(env);
  const currentQuestion = user.currentQuestion;
  const questionData = quizzes[quizId]?.[currentQuestion];
  if (!questionData) {
    return;
  }

  const letterLabels = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];
  let messageText = `${questionData.question}\n\n`;
  questionData.options.forEach((option, index) => {
    messageText += `${letterLabels[index]}. ${option}\n`;
  });
  messageText += "\nВыберите правильный ответ:";

  const keyboard = {
    inline_keyboard: questionData.options.map((_, index) => [
      { text: letterLabels[index], callback_data: `answer_${index}` }
    ])
  };

  if (questionData.image) {
    await sendPhoto(chatId, questionData.image, messageText, keyboard);
  } else {
    await sendMessage(chatId, messageText, keyboard);
  }
}

async function saveQuizResult(userId, quizId, user, timestamp, env) {
  const kvKey = `${userId}_${timestamp}`;
  const durationMs = user.quizStartedAt ? (timestamp - user.quizStartedAt) : null;
  const result = {
    telegramId: userId,
    username: user.username || 'Unknown',
    firstName: user.firstName,
    lastName: user.lastName,
    quizId: quizId,
    answers: user.answers,
    score: user.score,
    totalQuestions: (await loadQuizData(env))[quizId].length,
    quizStartedAt: user.quizStartedAt ? new Date(user.quizStartedAt).toISOString() : null,
    finishedAt: new Date(timestamp).toISOString(),
    durationMs,
    timestamp: new Date(timestamp).toISOString()
  };
  try {
    await env.kv_results.put(kvKey, JSON.stringify(result));
  } catch (error) {
    console.log('Error saving to KV:', error.message);
  }
}