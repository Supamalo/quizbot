export async function loadQuizData(env) {
  try {
    const quizzes = {};
    const quizFiles = ['breakfast.json', 'salads.json'];

    for (const file of quizFiles) {
      try {
        const value = await env.kv_quiz.get(file);
        if (!value) {
          console.log(`KV: No value for ${file}`);
          continue;
        }
        const data = JSON.parse(value);
        const quizId = file.replace('.json', '');
        quizzes[quizId] = data;
      } catch (err) {
        console.log(`KV error for ${file}:`, err);
      }
    }
    return quizzes;
  } catch (error) {
    console.log('KV fetch error in loadQuizData:', error.message);
    return {};
  }
}

export async function loadQuizNames() {
  return {
    breakfast: "Завтраки",
    salads: "Салаты и закуски"
  };
}