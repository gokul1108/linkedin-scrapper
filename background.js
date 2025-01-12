chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let jwtToken = '';
  if (message.action === "login") {
    const { email, password } = message;
    fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.token) {
          chrome.storage.local.set({ jwtToken: data.token }, () => {
            sendResponse({ status: "Login successful", token: data.token });
          });
        } else {
          sendResponse({ status: "Login failed" });
        }
      })
      .catch((error) => {
        console.error("Error during login:", error);
        sendResponse({ status: "Login error" });
      });
    return true;
  } else if (message.action === "scrapeProfiles") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url && !activeTab.url.startsWith("chrome://")) {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ["content.js"],
        });
        sendResponse({ status: "Scraping profiles..." });
      } else {
        console.error("Cannot scrape profiles: Invalid tab or page.");
        sendResponse({ status: "Error: Invalid tab or page." });
      }
    });
    return true;
  } else if (message.action === "scrapeContactInfo") {
    chrome.storage.local.get(
      ["profiles", "jwtToken"],
      ({ profiles, jwtToken }) => {
        if (profiles && profiles.length > 0) {
          let index = 0;
          const emails = [];

          function processNextProfile() {
            if (index < profiles.length) {
              const currentProfile = profiles[index];
              const overlayUrl = `${currentProfile.url}/overlay/contact-info/`;

              chrome.tabs.query(
                { active: true, currentWindow: true },
                (tabs) => {
                  const activeTab = tabs[0];
                  chrome.tabs.update(activeTab.id, { url: overlayUrl }, () => {
                    setTimeout(() => {
                      chrome.scripting.executeScript(
                        {
                          target: { tabId: activeTab.id },
                          func: scrapeContactInfo,
                        },
                        (results) => {
                          const contactInfo = results?.[0]?.result || {};
                          if (contactInfo.email) {
                            const emailData = {
                              name: currentProfile.name,
                              url: currentProfile.url,
                              email: contactInfo.email,
                            };

                            emails.push(emailData);

                            // Send data to backend with stored token
                            fetch("http://localhost:3000/api/data/", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${jwtToken}`,
                              },
                              body: JSON.stringify(emailData),
                            })
                              .then((response) => response.json())
                              .then((data) => {
                                console.log("Profile saved to database:", data);
                              })
                              .catch((error) => {
                                console.error("Error saving profile:", error);
                              });
                              console.log(jwtToken);

                            // Update popup dynamically
                            chrome.runtime.sendMessage({
                              action: "updateEmails",
                              emailData: emailData,
                            });
                          }

                          index++;
                          processNextProfile();
                        }
                      );
                    }, 5000);
                  });
                }
              );
            } else {
              chrome.storage.local.set({ emails }, () => {
                console.log("Finished processing all profiles.");
                chrome.runtime.sendMessage({ action: "scrapingComplete" });
              });
            }
          }

          processNextProfile();
        } else {
          console.log("No profiles available for contact info scraping.");
        }
      }
    );
    sendResponse({ status: "Contact info scraping started." });
    return true;
  }
});

function scrapeContactInfo() {
  return new Promise((resolve) => {
    const emailElement = document.querySelector('a[href^="mailto:"]');
    const email = emailElement ? emailElement.textContent.trim() : null;

    resolve({ email });
  });
}
