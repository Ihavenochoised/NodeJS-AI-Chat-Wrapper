import 'dotenv/config';

const url = 'https://openrouter.ai/api/v1/models/user';
const options = {method: 'GET', headers: {Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`}};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
