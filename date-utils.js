const axios = require('axios');

async function getCurrentDate() {
  try {
    const response = await axios.get('https://time.ir/api/json/today');
    const data = response.data;
    const year = data.year;
    const month = String(data.month).padStart(2, '0');
    const day = String(data.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error fetching date from time.ir:', error);
    return null;
  }
}

async function getEventsForDate(date) {
  try {
    const response = await axios.get('https://time.ir/api/json/today');
    const data = response.data;
    return data.events;
  } catch (error) {
    console.error('Error fetching events from time.ir:', error);
    return [];
  }
}

module.exports = {
  getCurrentDate,
  getEventsForDate,
};