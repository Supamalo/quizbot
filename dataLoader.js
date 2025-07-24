export async function loadQuizData(env) {
  try {
    const quizzes = {};
    const quizFiles = ['breakfast.json', 'salads.json'];

    if (!env.ASSETS) {
      console.log('ASSETS binding not found in env!');
      return {};
    }

    for (const file of quizFiles) {
      let response;
      try {
        response = await env.ASSETS.fetch(`/quizzes/${file}`);
        if (!response || !response.ok) {
          response = await env.ASSETS.fetch(`quizzes/${file}`);
        }
      } catch (fetchErr) {
        console.log(`Fetch threw for ${file}:`, fetchErr);
        continue;
      }
      if (!response || !response.ok) {
        let errorText = '';
        try {
          errorText = response ? await response.text() : 'No response';
        } catch (e) {
          errorText = 'Could not read error text';
        }
        console.log(`Error loading quiz data for ${file}:`, errorText);
        continue;
      }
      try {
        const data = await response.json();
        const quizId = file.replace('.json', '');
        quizzes[quizId] = data;
      } catch (jsonErr) {
        console.log(`JSON parse error for ${file}:`, jsonErr);
      }
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