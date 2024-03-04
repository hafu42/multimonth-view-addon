/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tempted to just use `var { calendar } = messenger;`?
// You will find yourself naming function arguments `calendar` way too often.
var { calendar: lightning } = messenger;

lightning.calendars.onCreated.addListener((calendar) => {
  console.log("Created calendar", calendar);
});
lightning.calendars.onUpdated.addListener((calendar, changeInfo) => {
  console.log("Updated calendar", calendar, changeInfo);
});
lightning.calendars.onRemoved.addListener((id) => {
  console.log("Removed calendar", id);
});

lightning.items.onCreated.addListener((item) => {
  console.log("Created item", item);
}, { returnFormat: "ical" });
lightning.items.onUpdated.addListener((item, changeInfo) => {
  console.log("Updated item", item, changeInfo);
}, { returnFormat: "ical" });
lightning.items.onRemoved.addListener((calendarId, id) => {
  console.log("Deleted item", id);
});
lightning.items.onAlarm.addListener((item, alarm) => {
  console.log("Alarm item", item, alarm);
}, { returnFormat: "ical" });

function icalDate(date) {
  return date.toISOString().replace(/\.\d+Z$/, "").replace(/[:-]/g, "");
}

lightning.provider.onItemCreated.addListener(async (calendar, item) => {
  console.log("Provider add to calendar", item);
  item.metadata = { created: true };
  return item;
}, { returnFormat: "ical" });
lightning.provider.onItemUpdated.addListener(async (calendar, item, oldItem) => {
  console.log("Provider modify in calendar", item, oldItem);
  item.metadata = { updated: true };
  return item;
}, { returnFormat: "ical" });
lightning.provider.onItemRemoved.addListener(async (calendar, item) => {
  console.log("Provider remove from calendar", item);
});

let ticks = {};
lightning.provider.onInit.addListener(async (calendar) => {
  console.log("Initializing", calendar);
});
lightning.provider.onSync.addListener(async (calendar) => {
  console.log("Synchronizing", calendar, "tick", ticks[calendar.id]);

  if (!ticks[calendar.id]) {
    ticks[calendar.id] = 0;

    await lightning.items.create(calendar.cacheId, {
      id: "findme",
      type: "event",
      title: "New Event",
      startDate: icalDate(new Date()),
      endDate: icalDate(new Date()),
      metadata: { etag: 123 }
    });
  } else if (ticks[calendar.id] == 1) {
    await lightning.items.update(calendar.cacheId, "findme", {
      title: "Updated",
      startDate: icalDate(new Date()),
      endDate: icalDate(new Date()),
      metadata: { etag: 234 }
    });
  } else if (ticks[calendar.id] == 2) {
    await lightning.calendars.clear(calendar.cacheId);
  } else {
    ticks[calendar.id] = -1;
  }

  ticks[calendar.id]++;
});

lightning.provider.onResetSync.addListener(async (calendar) => {
  console.log("Reset sync for", calendar);
  delete ticks[calendar.id];
});

setTimeout(async () => {
  let calendars = await lightning.calendars.query({ type: "ext-" + messenger.runtime.id });
  await Promise.all(calendars.map((calendar) => lightning.calendars.remove(calendar.id)));

  await lightning.calendars.synchronize();
  await new Promise(resolve => setTimeout(resolve, 500));

  await new Promise(resolve => setTimeout(resolve, 2000));
}, 2000);

browser.browserAction.onClicked.addListener(() => {
  browser.tabs.create({
    url: "sidebar/yearView.html"
  });
});

let messageQueue = [];
let contentScriptReady = false;

function queueOrSendMessage(message) {
    if (!contentScriptReady) {
        console.log("Content script not ready, queuing message:", message);
        messageQueue.push(message);
    } else {
        console.log("Content script ready, sending message:", message);
        messenger.runtime.sendMessage(message);
    }
}

function onContentScriptReady() {
    console.log("Content script reported ready, sending the calendar data...");
    contentScriptReady = true;
    // Combine fetching of calendar details, events, and user storage
    let calendarDetailsPromise = messenger.calendar.calendars.query({});
    let now = new Date();
    let startOfYear = new Date(now.getFullYear(), 0, 1); // January 1st of the current year
    let endOfYear = new Date(now.getFullYear(), 11, 31); // December 31st of the current year
    let rangeStart = icalDate(startOfYear);
    let rangeEnd = icalDate(endOfYear);
    let eventsPromise = lightning.items.query({
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
      expand: true // Include recurring events
    });
    let userStoragePromise = browser.storage.local.get('UserStorage');

    Promise.all([calendarDetailsPromise, eventsPromise, userStoragePromise]).then(([calendarDetails, events, userStorageResult]) => {
      let userStorage = userStorageResult.UserStorage || {};

      messenger.runtime.sendMessage({
        action: "getCalendarDataCombined",
        calendarDetails: calendarDetails,
        events: events,
        userStorage: userStorage
      });
    }).catch(error => {
      console.error("Error fetching combined calendar data:", error);
    });
}

messenger.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "contentScriptReady") {
    onContentScriptReady();
  } else if (message.action === "saveMonthRange") {
    saveMonthRange(message.monthRange);
  } else if (message.action === "saveCalendarVisibilityState") {
    saveCalendarVisibilityState(message.calendarId, message.isVisible);
  } else if (message.action == "saveFirstMonthYear") {
    saveFirstMonthYear(message.firstMonthYear);
  } else if (message.action == "fetchEventsForYear") {
    const year = message.year;
    try {
      const events = await fetchEventsForYearFromSource(year);
      // After fetching events successfully, send them to the content script
      messenger.runtime.sendMessage({
        action: "eventsForYearFetched",
        year: year, // The year for which events were fetched
        events: events // The fetched events
      });
    } catch (error) {
      console.error("Error fetching events for year:", year, error);
      sendResponse({error: "Failed to fetch events"});
    }
    return true; // Indicates you wish to send a response asynchronously

  }
});

async function fetchEventsForYearFromSource(year) {
  // Calculate the start and end dates of the year
  let rangeStart = new Date(year, 0, 1); // January 1st of the year
  let rangeEnd = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st of the year

  // Convert dates to the required format for querying
  let formattedRangeStart = icalDate(rangeStart);
  let formattedRangeEnd = icalDate(rangeEnd);

  try {
    // Query the events within the specified date range
    let events = await lightning.items.query({
      rangeStart: formattedRangeStart,
      rangeEnd: formattedRangeEnd,
      expand: true // Include recurring events
    });

    return events; // Return the fetched events
  } catch (error) {
    console.error("Error fetching events for year:", year, error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

function saveFirstMonthYear(firstMonthYear) {
  console.log("Saving first month and year:", firstMonthYear);
  browser.storage.local.set({UserStorage: {firstMonthYear: firstMonthYear}}).then(() => {
  }).catch((error) => {
    console.error('Error saving first month and year:', error);
  });
}

function saveMonthRange(monthRange) {
  console.log("Saving month range:", monthRange);
  browser.storage.local.set({UserStorage: {monthRange: monthRange}}).then(() => {
  }).catch((error) => {
    console.error('Error saving month range:', error);
  });
}

// Helper function to save the visibility state of a calendar
function saveCalendarVisibilityState(calendarId, isVisible) {
  // Retrieve the current state object, or initialize it if it doesn't exist
  browser.storage.local.get('UserStorage').then((result) => {
    let userStorage = result.UserStorage || {};
    let states = userStorage.calendarVisibilityStates || {};
    // Update the state for the specific calendarId
    states[calendarId] = isVisible;
    // Save the updated states object back to storage
    userStorage.calendarVisibilityStates = states;
    browser.storage.local.set({UserStorage: userStorage}).then(() => {
      console.log('visibility State saved successfully:', userStorage.calendarVisibilityStates);
    }).catch((error) => {
      console.error('Error saving state:', error);
    });
  }).catch((error) => {
    console.error('Error retrieving states:', error);
  });
}
