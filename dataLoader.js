export async function loadQuizData() {
  try {
    const quizzes = {};
    const quizFiles = ['breakfast.json', 'salads.json'];

    for (const file of quizFiles) {
      const response = await env.ASSETS.fetch(`quizzes/${file}`);
      if (!response.ok) {
        console.log(`Error loading quiz data for ${file}:`, await response.text());
        continue;
      }
      const data = await response.json();
      const quizId = file.replace('.json', '');
      quizzes[quizId] = data;
    }
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