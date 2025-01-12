
document.getElementById("login-button").addEventListener("click", () => {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const scrapButton= document.getElementById("scrape-button");
  chrome.runtime.sendMessage({ action: "login", email, password }, (response) => {
    console.log(response.status);
    if (response.status === 'Login successful') {
      // Store the token in local storage
      localStorage.setItem('jwtToken', response.token);
      alert('Login successful');
      scrapButton.style.display = "block";
    } else {
      alert('Login failed');
    }
  });
});



document.getElementById("scrape-button").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "scrapeProfiles" }, (response) => {
    console.log(response.status);


  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const profileList = document.getElementById("profile-list");
  const emailList = document.getElementById("email-list");
  const scrapeContactButton = document.getElementById("scrape-contact-info");

  if (message.action === "updateProfiles") {
    const listItem = document.createElement("li");
    listItem.innerHTML = `<strong>${message.profile.name}</strong>: <a href="${message.profile.url}" target="_blank">${message.profile.url}</a>`;
    profileList.appendChild(listItem);

    // Show "Scrape Contact Info" button if it's hidden
    if (scrapeContactButton.style.display === "none") {
      scrapeContactButton.style.display = "block";
    }
  } else if (message.action === "updateEmails") {
    const listItem = document.createElement("li");
    listItem.innerHTML = `<strong>${message.emailData.name}</strong>: <a href="${message.emailData.url}" target="_blank">${message.emailData.url}</a> - ${message.emailData.email}`;
    emailList.appendChild(listItem);
  } else if (message.action === "scrapingComplete") {
    console.log("Scraping process complete.");
  }
});

document.getElementById("scrape-contact-info").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "scrapeContactInfo" }, (response) => {
    console.log(response.status);
  });
});
