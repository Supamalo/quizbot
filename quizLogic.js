import { sendMessage, sendPhoto, answerCallback } from './telegramApi.js';
import { loadQuizData, loadQuizNames } from './dataLoader.js';
import { userData } from './main.js'; // добавлено

export async function startQuiz(chatId, env) {
  const quizNames = await loadQuizNames();
  const keyboard = {
    inline_keyboard: Object.keys(quizNames).map(quizId => [
      { text: quizNames[quizId], callback_data: `quiz_${quizId}` }
    ])
  };
  await sendMessage(chatId, "Добро пожаловать! Выберите тему квиза:", keyboard);
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
    answers: []
  });
  await sendQuestion(chatId, userData.get(userId), user.quizId, env);
  return new Response('OK', { status: 200 });
}

export async function processAnswer(callbackQuery, env) {
  const { id: callbackId, from: { id: userId }, data, message } = callbackQuery;
  const chatId = message.chat.id;

  if (data === "restart_quiz") {
    await startQuiz(chatId, env);
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
    const now = Date.now();
    userData.set(userId, {
      quizId,
      state: 'awaiting_name',
      username: callbackQuery.from.username || '',
      currentQuestion: 0,
      score: 0,
      answers: [],
      quizStartedAt: now // сохраняем время начала квиза
    });
    await sendMessage(chatId, "Пожалуйста, укажите ваше имя и фамилию через пробел (например: Иван Иванов).");
    await answerCallback(callbackId);
    return new Response('OK', { status: 200 });
  } else if (data.startsWith("answer_")) {
    const user = userData.get(userId);
    if (!user || user.state !== 'quiz_started') {
      await sendMessage(chatId, "Пожалуйста, начните квиз заново с помощью /start.");
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
      const startedAt = user.quizStartedAt ? new Date(user.quizStartedAt).toISOString().replace(/\.\d{3}Z$/, 'Z') : '';
      const finishedAt = new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z');
      const durationMs = user.quizStartedAt ? (timestamp - user.quizStartedAt) : null;
      const durationStr = durationMs !== null
        ? `Длительность: ${Math.floor(durationMs / 1000)} сек.`
        : '';
      //const messageText = `Квиз пройден: ${user.firstName} ${user.lastName} (@${user.username || 'Unknown'})
      const messageText = `Квиз пройден: ${user.firstName} ${user.lastName}${user.username ? ` (@${user.username})` : ''}
Тема: ${quizName}
Результат: ${score} из ${total}
Время начала: ${startedAt}
Время окончания: ${finishedAt}
${durationStr}`;
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
        user.score += 1;
        await sendMessage(chatId, "Правильно!");
      } else {
        const correctOption = questionData.options[questionData.correct];
        //await sendMessage(chatId, `Неправильно! Правильный ответ: ${correctOption}`);
        await sendMessage(chatId, `Неправильно!`);
      }
      user.currentQuestion += 1;
      if (user.currentQuestion < quizzes[quizId].length) {
        await sendQuestion(chatId, user, quizId, env);
      } else {
        const timestamp = Date.now();
        const score = user.score;
        const total = quizzes[quizId].length;
        const quizNames = await loadQuizNames();
        const quizName = quizNames[quizId] || quizId;
        const startedAt = user.quizStartedAt ? new Date(user.quizStartedAt).toISOString().replace(/\.\d{3}Z$/, 'Z') : '';
        const finishedAt = new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z');
        const durationMs = user.quizStartedAt ? (timestamp - user.quizStartedAt) : null;
        const durationStr = durationMs !== null
          ? `Длительность: ${Math.floor(durationMs / 1000)} сек.`
          : '';
        const messageText = `Квиз пройден: ${user.firstName} ${user.lastName}${user.username ? ` (@${user.username})` : ''}
Тема: ${quizName}
Результат: ${score} из ${total}
Время начала: ${startedAt}
Время окончания: ${finishedAt}
${durationStr}`;
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
  }

  await answerCallback(callbackId);
  return new Response('OK', { status: 200 });
}

async function sendQuestion(chatId, user, quizId, env) {
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
    quizStartedAt: user.quizStartedAt ? new Date(user.quizStartedAt).toISOString().replace(/\.\d{3}Z$/, 'Z') : null,
    finishedAt: new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    durationMs,
    timestamp: new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, 'Z')
  };
  try {
    await env.kv_results.put(kvKey, JSON.stringify(result));
  } catch (error) {
    console.log('Error saving to KV:', error.message);
  }
}
