//api for finding jobs using certain keywords and send reminder notification
// version 2.0
//author: JITHIN BINOY

require("dotenv").config();
const cors = require("cors");
const express = require("express");
const axios = require("axios");
const https = require("https");
const jsdom = require("jsdom");
const cron = require("node-cron");
const nodemailer = require('nodemailer');
const { JSDOM } = jsdom;

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;
const webUrl = process.env.WEBURL;
let jobs = [];
let previousjob = [];

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
});

const generateEmailHtml = (jobs) => {
  let rows = jobs.map(job => `
    <tr style="background-color: rgba(0, 123, 255, 0.1);">
      <td style="padding: 8px; text-align: left;">${job.title}</td>
      <td style="padding: 8px; text-align: left;">${job.name}</td>
      <td style="padding: 8px; text-align: left;">
        <a href="${job.link}" class="btn-primary" style="color: #fff; background-color: #28a745; border: 1px solid #28a745; padding: 0.375rem 0.75rem; font-size: 1rem; text-decoration: none; border-radius: 0.25rem;">
          Apply
        </a>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Portal</title>
        <style>
            body {
                background-color: #e0e0e062;
                font-family: Arial, sans-serif;
                width: 100vw;
            }
            .header {
                background-color: #00e1ff;
                color: white;
                padding: 5px;
                text-align: center;
                border: transparent;
                border-radius: 18px 18px 0px 0px;
            }
            .table-container {
                overflow-x: auto;
            }
            .rounded-table {
                border: 1px solid #dee2e6;
                border-radius: 15px;
                overflow: hidden;
                width: 100%;
                border-collapse: separate;
            }
            .rounded-table thead {
                border-bottom: 2px solid #dee2e6;
                background-color: #ed8686;
                color: #000000;
            }
            .rounded-table th, .rounded-table td {
                border: none;
                padding: 8px;
                text-align: left;
            }
            .btn-primary {
                display: inline-block;
                font-weight: 400;
                color: #fff;
                text-align: center;
                vertical-align: middle;
                user-select: none;
                background-color: #28a745;
                border: 1px solid #28a745;
                padding: 0.375rem 0.75rem;
                font-size: 1rem;
                line-height: 1.5;
                border-radius: 0.25rem;
                text-decoration: none;
            }
            .text-warning {
                color: #ffc107 !important;
            }
            .text-danger {
                color: #ff0019 !important;
                font-weight: bold;
            }
            .text-success {
                color: #28a745 !important;
            }
            .btn-outline-warning {
                border-color: #ffc107;
                color: #ffc107;
                padding: 5px 10px;
                text-decoration: none;
                display: inline-block;
            }
            .btn {
                text-align: center;
                border: solid;
                border-radius: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container" style="padding: 20px; max-width: 600px; margin: auto;">
            <div class="header">
                <h3>New Job Opportunities</h3>
            </div>
            <p>Hi,</p>
            <p>We found new job opportunities that match your requirements. Please check them out below:</p>
            <div class="table-container" style="margin-bottom: 20px;">
                <table class="rounded-table" style="width: 100%; border: 1px solid #dee2e6; border-radius: 15px; overflow: hidden;">
                    <thead style="background-color: #f1f1f1;">
                        <tr>
                            <th scope="col" style="padding: 8px; text-align: left;">Position</th>
                            <th scope="col" style="padding: 8px; text-align: left;">Company Name</th>
                            <th scope="col" style="padding: 8px; text-align: left;">Apply</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
            <p class="text-danger" style="color: #dc3545; font-weight:normal;">This is a reminder email only. This application is built using specific keywords. There may be a chance that some jobs are missed, so please also check the website directly.</p>
            <p class="text-danger" style="color: #dc3545; font-weight: normal;">To stop email notifications, please contact the developer or reply to this email.
                <br>
                <p>Thank You.</p>
                <a href="mailto:jithinbinoyp@gmail.com" class="btn-outline-warning btn text-center" style="border-color: #000000; color: #000000; padding: 5px 10px; text-decoration: none; display: inline-block;">Contact Us</a>
            </p>
        </div>
    </body>
    </html>
  `;
};

const getWebContent = async () => {
  const getWebContentResponse = await axiosInstance.get(webUrl);
  const { document } = new JSDOM(getWebContentResponse.data).window;

  let newJobs = []; // Store new jobs found in this run

  document.querySelectorAll(".company-list").forEach(element => {
    const titleElement = element.querySelector("a").textContent.toLowerCase(); // get job title
    const nameElement = element.querySelector(".joblist .jobs-comp-name").textContent; // get company name
    const linkElement = element.querySelector(".jobs-comp-name a").getAttribute("href"); // get apply link

    if (titleElement && nameElement && linkElement) {
      const keywords = ["intern", "web", "react", "node", "angular", "mearn", "mean"]; // keywords to check
      const filterjobs = keywords.some(keyword => titleElement.includes(keyword)); // filter jobs by keyword

      if (filterjobs) {
        if (!previousjob.some(job => job.title === titleElement && job.name === nameElement)) { // checking existing job titles
          const newJob = {
            title: titleElement,
            name: nameElement,
            link: linkElement,
          };
          jobs.push(newJob);
          newJobs.push(newJob); // Add to new jobs for this run
          previousjob.push(newJob); // Add to previous jobs to prevent future duplicates
        }
      }
    }
  });

  if (newJobs.length > 0) {
    await sendEmail(newJobs);
    console.log("Email sent with new jobs");
  } else {
    console.log("No new jobs found");
  }

  return newJobs;
};

const sendEmail = async (newJobs) => {
  const emailHtml = generateEmailHtml(newJobs);
  const mailOption = {
    from: process.env.EMAIL,
    to: "jithinbinoyp@gmail.com",//allenjohnmonapallil@gmail.com,
    subject: "Find new Jobs @ Infopark",
    html: emailHtml
  };

  await transporter.sendMail(mailOption);
};

cron.schedule("*/1 * * * *", async () => {
  await getWebContent();
});

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get("/", async (request, response) => {
  const jobs = await getWebContent();
  if (jobs.length > 0) {
    response.status(200).send(previousjob);
  } else {
    response.status(500).send("Internal server error, please try again or contact the developer");
  }
});
