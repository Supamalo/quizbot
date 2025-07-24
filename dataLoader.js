export async function loadQuizData(env) {
  try {
    const quizzes = {};
    const quizFiles = ['breakfast.json', 'salads.json'];

    for (const file of quizFiles) {
      // Попробуйте оба варианта пути
      let response = await env.ASSETS.fetch(`/quizzes/${file}`);
      if (!response || !response.ok) {
        response = await env.ASSETS.fetch(`quizzes/${file}`);
      }
      if (!response || !response.ok) {
        console.log(`Error loading quiz data for ${file}:`, response ? await response.text() : 'No response');
        continue;
      }
      const data = await response.json();
      const quizId = file.replace('.json', '');
      quizzes[quizId] = data;
    }
    console.log('Loaded quizzes:', quizzes); // Для отладки
    return quizzes;
  } catch (error) {
    console.log('Fetch error in loadQuizData:', error.message);
    return {};
  }
}

export async function loadQuizNames() {
  return {
    breakfast: "Завтраки",
    salads: "Салаты и закуски"
  };
}