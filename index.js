require('dotenv').config()
const cron = require('node-cron');
const puppeteer = require('puppeteer');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const numbers = process.env.PHONE_NUMBERS.split(',');
const fromNumber = process.env.FROM_NUMBER;

async function sendSMS(toNumber, messageText) {
  const message = await client.messages
    .create({
      body: messageText,
      from: `+${fromNumber}`,
      to: `+${toNumber}`,
    });

  console.log(message.sid);
}

async function parseBills() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`https://www.govtrack.us/congress/bills/subjects/climate_change_and_greenhouse_gases/6040`);

  const bills = await page.evaluate(() => {
    const results = [...document
      .querySelectorAll('.results .row')]
      .map(e => ({
        title: e.querySelector('a').innerHTML,
        link: `https://www.govtrack.us${e.querySelector('a').getAttribute('href')}`
      }))
    return results
  });

  await browser.close();

  return bills.slice(0, 5).map(b => `${b.title}: Learn more at ${b.link}`).join('\n')
}

const cronJobFrequency = '*/1 * * * *';
// const cronJobFrequency = '0 17 * * 0'; // Send every sunday
cron.schedule(cronJobFrequency, async () => {
  console.log("Get bills");
  const billMessage = await parseBills();
  console.log(billMessage);
  for (const num of numbers) {
    await sendSMS(num, billMessage);
  }
});
