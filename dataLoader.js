export async function loadQuizData() {
  try {
    const response = await fetch('/quizzes/breakfast.json');
    if (!response.ok) {
      console.log('Error loading quiz data:', await response.text());
      return {};
    }
    const data = await response.json();
    return { breakfast: data };
  } catch (error) {
    console.log('Fetch error in loadQuizData:', error.message);
    return {};
  }
}

export async function loadQuizNames() {
  return { breakfast: "Завтраки" };
}