let isCalendarListPopulated = false;
let StoredEvents = null;
let today = new Date();
let firstMonthYear = {
  month: 0, // Default month (January)
  year: today.getFullYear() // Current year
};
let monthRange = 12;
let fetchedYears = new Set([new Date().getFullYear()]);

function createTopRow() {
  const calendarEl = document.getElementById('calendar');
  const parentEl = calendarEl.parentNode; // Get the parent of the calendar element

  // Create a new div element for the top row
  const topRowEl = document.createElement('div');
  topRowEl.id = "top-row-container";

  // Create an empty cell for the first column in the top row
  const emptyCell = document.createElement('div');
  emptyCell.id = 'top-row-empty-cell';
  emptyCell.innerHTML = 'Mo.&nbsp;';
  topRowEl.appendChild(emptyCell);

  // Array of weekday abbreviations
  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Calculate total headers needed (5 weeks and 2 days = 37 days)
  const totalHeaders = 5 * 7 + 2; // 5 weeks * 7 days/week + 2 days

  // Append the weekday headers for 5 weeks and 2 days to the top row
  for (let i = 0; i < totalHeaders; i++) {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'weekday-header';
    dayHeader.textContent = weekdays[i % 7]; // Use modulo to loop over weekdays
    topRowEl.appendChild(dayHeader);
  }

  // Insert the top row before the calendar element
  parentEl.insertBefore(topRowEl, calendarEl);
}

function createMonthRow(calendarEl, monthName, monthNumber, totalDays, year, today) {
  // Create and append the month name cell
  const monthNameCell = document.createElement('div');
  monthNameCell.className = 'month-name month-row'; // Add 'month-row' class here

  monthNameCell.textContent = monthName;
  calendarEl.appendChild(monthNameCell);

  // Add 'january' class for January
  if (monthNumber === 0) { // January is monthNumber 0
      monthNameCell.classList.add('january');
  }

  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Calculate the day of the week for the 1st of the month
  const firstDayDate = new Date(year, monthNumber, 1);
  let firstDayOfWeek = firstDayDate.getDay(); // This will give 0 (Sunday) to 6 (Saturday)
  firstDayOfWeek = (firstDayOfWeek === 0) ? 6 : firstDayOfWeek - 1; // Adjust to make Monday (0) to Sunday (6)

  // Fill in the blanks before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'empty-cell';
    // Add 'january' class for January
    if (monthNumber === 0) { // January is monthNumber 0
      emptyCell.classList.add('january');
    }
    calendarEl.appendChild(emptyCell);
  }

  // Create cells for each day of the month
  for (let day = 1; day <= totalDays; day++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'day';
    // Add 'january' class for January
    if (monthNumber === 0) { // January is monthNumber 0
      dayCell.classList.add('january');
    }
    
    // Format the month and day to ensure two digits
    const formattedMonth = (monthNumber + 1).toString().padStart(2, '0'); // JavaScript months are 0-indexed, add 1 to match calendar months
    const formattedDay = day.toString().padStart(2, '0');

    // Set the data-date attribute in the format YYYY-MM-DD
    dayCell.setAttribute('data-date', `${year}-${formattedMonth}-${formattedDay}`);
    
    // Identify weekends
    const date = new Date(year, monthNumber, day);
    if(date.getDay() === 0 || date.getDay() === 6) { // 0 = Sunday, 6 = Saturday
        dayCell.classList.add('weekend');
    }
    
    if(year === todayYear && monthNumber === todayMonth && day === todayDate) {
        dayCell.classList.add('today');
    }
    
    // Create and append the day number element
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);
    calendarEl.appendChild(dayCell);
  }

  // Fill in the blanks after the last day of the month to maintain the structure
  const totalCellsBeforeAddingEmpty = firstDayOfWeek + totalDays;
  const cellsAfter = totalCellsBeforeAddingEmpty >= 37 ? 0 : 37 - totalCellsBeforeAddingEmpty;
  for (let i = 0; i < cellsAfter; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'empty-cell';
    if (monthNumber === 0) { // January is monthNumber 0
      emptyCell.classList.add('january');
    }
    calendarEl.appendChild(emptyCell);
  }
}

function createDayCells(year, today, first_month=0, monthRange=12) {
  console.log("Creating the cells: ", year, today, first_month, monthRange);
  const calendarEl = document.getElementById('calendar');
  calendarEl.innerHTML = ''; // Clear existing calendar content

  for (let i = 0; i < monthRange; i++) {
    let monthIndex = (first_month + i) % 12;
    let adjustedYear = year + Math.floor((first_month + i) / 12);
    // Generate month name and slice to first three letters
    let monthName = new Date(adjustedYear, monthIndex).toLocaleString('default', { month: 'long' }).slice(0, 3);
    let totalDays = new Date(adjustedYear, monthIndex + 1, 0).getDate();

    createMonthRow(calendarEl, monthName, monthIndex, totalDays, adjustedYear, today);
  }

  document.documentElement.style.setProperty('--month-range', monthRange.toString());

  document.querySelectorAll('.day').forEach(dayCell => {
    dayCell.addEventListener('mouseover', function(e) {
      let popup = document.querySelector(`div.event-popup[data-start-date="${this.getAttribute('data-date')}"]`);
      // Check if the popup is disabled for mouseover
      if (popup && popup.getAttribute('data-disable-mouseover') !== 'true') {
        // Check if there are any visible items in the popup
        const visibleItems = popup.querySelectorAll('ul li:not([style*="display: none"])');
        if (visibleItems.length > 0) {
          // Calculate and set the position of the popup only if there are visible items
          const rect = this.getBoundingClientRect();
          let top = rect.bottom + window.scrollY;
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          popup.style.display = 'block'; // Make it visible to calculate dimensions
          // Example adjustment to move the popup more to the left
          let leftAdjustment = 125; // Adjust this value as needed to move the popup more to the left
          let left = rect.left + window.scrollX + (rect.width / 2) - (popup.offsetWidth / 2) - leftAdjustment;          
          // Ensure the popup stays inside the screen on the right
          if (left + popup.offsetWidth +150 > screenWidth) {
              left = screenWidth - popup.offsetWidth - 250; // Adjust left to keep popup inside, add some margin
          }

          // Ensure the popup does not go off the screen on the left
          if (left < 0) {
              left = 20; // Add some margin from the left edge
          }

          // Ensure the popup does not go off the screen at the bottom
          if (top + popup.offsetHeight > screenHeight) {
              top = screenHeight - popup.offsetHeight - 20; // Adjust top to keep popup inside, add some margin
          }

          // Ensure the popup is not positioned too high
          if (top < 0) {
              top = 20; // Add some margin from the top edge
          }

          popup.style.position = 'absolute';
          popup.style.top = `${top}px`;
          popup.style.left = `${left}px`;
          popup.style.visibility = 'visible'; // Make the popup fully visible after positioning
        }
      }
    });

    dayCell.addEventListener('mouseout', function() {
      let popup = document.querySelector(`div.event-popup[data-start-date="${this.getAttribute('data-date')}"]`);
      if (popup) {
        popup.style.display = 'none'; // Hide the popup
      }
  });
});
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "getCalendarDataCombined") {
    console.log("Received combined calendar data:", message);
    const { calendarDetails, events, userStorage } = message;

    if (userStorage && userStorage.firstMonthYear) {  
      firstMonthYear.month = userStorage.firstMonthYear.month; // Ensure month is within valid range
      firstMonthYear.year = userStorage.firstMonthYear.year;
    }
    
    document.querySelectorAll('#year-selector button').forEach(button => {
      button.addEventListener('click', function() {
          let monthChange = parseInt(this.getAttribute('data-month-change'), 10);
          let newFirstMonth = firstMonthYear.month + monthChange;
          let yearChange = 0; // Track if the year has changed
          
          // Adjust for negative newFirstMonth values
          if (newFirstMonth < 0) {
              const yearsToSubtract = Math.ceil(Math.abs(newFirstMonth) / 12);
              firstMonthYear.year -= yearsToSubtract; // Subtract the years
              newFirstMonth = 12 + (newFirstMonth % 12); // Calculate the new first month
              if (newFirstMonth === 12) { // Adjust if newFirstMonth ends up being 12
                  newFirstMonth = 0;
                  firstMonthYear.year += 1;
              }
              yearChange = -yearsToSubtract;
          } else if (newFirstMonth > 11) { // Adjust for newFirstMonth exceeding December
              firstMonthYear.year += Math.floor(newFirstMonth / 12);
              newFirstMonth = newFirstMonth % 12; // Correctly set newFirstMonth to 0 for January
              yearChange = firstMonthYear.year;
            }

          firstMonthYear.month = newFirstMonth;
          console.log("Year selector clicked: newFirstMonth: ", newFirstMonth, ", monthRange: ", monthRange, ", startYear: ", firstMonthYear.year);
          // Call the functions with the new first month
          setYearSelectorValues(firstMonthYear.month, monthRange, firstMonthYear.year);
          createDayCells(firstMonthYear.year, today, firstMonthYear.month, monthRange);
          displayCalendarEvents();
  
          // Send the message to save the new first month
          browser.runtime.sendMessage({
              action: "saveFirstMonthYear",
              firstMonthYear: firstMonthYear
          });

          // Check if the year has changed and fetch events for the new year
          if (yearChange !== 0 && !fetchedYears.has(firstMonthYear.year)) {
            showLoadingPopup(); // Show loading popup
            browser.runtime.sendMessage({
              action: "fetchEventsForYear",
              year: firstMonthYear.year
            });
            fetchedYears.add(firstMonthYear.year); // Mark this year as fetched
          }
      });
    });
    
    createTopRow();
    // Populate the calendar with the current year and today's date
    createDayCells(firstMonthYear.year, today, firstMonthYear.month, monthRange); // Adjust populateCalendar to accept today as an argument

    if (calendarDetails) {
      console.log("Received calendar details:", calendarDetails);
      populateCalendarList(calendarDetails);
    }
    if (events) {
      console.log("Received calendar events:", events);
      StoredEvents = events;
      displayCalendarEvents();
    }
    if (userStorage) {
      console.log("Received user storage:", userStorage);
      
      const calendarVisibilityStates = userStorage.calendarVisibilityStates || {};
      applyStoredCalendarVisibilityStates(calendarVisibilityStates);
    }
    // get userStorage but also check that they are defined
    if (userStorage && userStorage.monthRange !== undefined) {  
      monthRange = userStorage.monthRange;
      document.getElementById('month-range-slider').value = monthRange;
    }

    
  
    // Add event listener for month-range-selector change
    const monthRangeSelector = document.getElementById('month-range-selector');

    monthRangeSelector.addEventListener('change', function(event) {
      const selectedValue = event.target.value; // Use event.target instead of this
      const selectedMonthRange = parseInt(selectedValue, 10);

      setYearSelectorValues(firstMonthYear.month, selectedMonthRange, firstMonthYear.year);
      
      // Assuming you have a way to get the current year and today's date
      createDayCells(firstMonthYear.year, today, firstMonthYear.month, selectedMonthRange);
      displayCalendarEvents();

      browser.runtime.sendMessage({
        action: "saveMonthRange",
        monthRange: selectedMonthRange
      });
      // and change the global variable
      monthRange = selectedMonthRange
    });

    // Update the popup mouseover functionality after the month range is changed
    updatePopupMouseoverFunctionality();


        
    setYearSelectorValues(firstMonthYear.month, monthRange, firstMonthYear.year);
    
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const dateString = today.toLocaleDateString(undefined, options); // 'undefined' uses the browser's default locale
  
    // Set the "Today" button's text to today's date in extended literal form with the day of the week
    const todayButton = document.getElementById('today-button');
    if (todayButton) {
      todayButton.textContent = `${dateString}`;
      todayButton.addEventListener('click', function() {
        let prevMonth = today.getMonth() - 1; // Get the previous month
        let year = today.getFullYear();
  
        if (prevMonth < 0) {
          prevMonth = 11; // Set to December
          year -= 1; // Decrement the year
        }
  
        // Assuming setYearSelectorValues and createDayCells are the functions to update the view
        setYearSelectorValues(prevMonth, monthRange, year);
        createDayCells(year, today, prevMonth, monthRange);
        displayCalendarEvents();
      });
    }

  }
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "eventsForYearFetched") {
      if (message.events) {
        console.log("Received supplementary events for year:", message.year, message.events);
        StoredEvents = [...StoredEvents, ...message.events];
        hideLoadingPopup();
        displayCalendarEvents();
      }
    }
  });
});

function setYearSelectorValues(first_month, monthRange, startYear) {
  console.log("Setting month and year in selector: first_month: ", first_month, ", monthRange: ", monthRange, ", startYear: ", startYear);
  // Calculate end month and year
  let endMonthIndex = (first_month + monthRange - 1) % 12; // Adjust for zero-based index
  let endYear = startYear + Math.floor((first_month + monthRange - 1) / 12);

  // Convert month index to month name
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startMonthName = monthNames[first_month];
  const endMonthName = monthNames[endMonthIndex];

  // Set the values in the year selector
  document.getElementById('start-month').textContent = startMonthName;
  document.getElementById('start-year').textContent = startYear.toString();
  document.getElementById('end-month').textContent = endMonthName;
  document.getElementById('end-year').textContent = endYear.toString();
  document.documentElement.style.setProperty('--month-range', monthRange.toString());
}

function populateCalendarList(calendarDetails) {
  const calendarList = document.getElementById('calendar-list');
  calendarList.innerHTML = ''; // Clear existing list items

  calendarDetails.forEach(detail => {
    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', detail.id); // Store the calendar ID for later use
    listItem.setAttribute('data-color', detail.color); // Store the calendar color for later use

    // Create a checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `checkbox-${detail.id}`;
    checkbox.checked = true; // Enable checkbox by default
    checkbox.setAttribute('data-id', detail.id); // Store the calendar ID for later use

    // Create a label for the checkbox
    const label = document.createElement('label');
    label.htmlFor = `checkbox-${detail.id}`;
    label.textContent = detail.name;
    label.style.color = detail.color; // Apply the color to the label text

    // Append the checkbox and label to the list item
    listItem.appendChild(checkbox);
    listItem.appendChild(label);

    // Append the list item to the calendar list
    calendarList.appendChild(listItem);

    // Event listener to toggle the display of events
    checkbox.addEventListener('change', function() {
      toggleCalendarEvents(detail.id, this.checked);
    });
  });

  isCalendarListPopulated = true;

}

function toggleCalendarEvents(calendarId, isVisible) {
  // Retrieve all event ribbons for the specified calendar ID
  const eventRibbons = document.querySelectorAll(`.event-ribbon[data-calendar-id="${calendarId}"]`);
  eventRibbons.forEach(ribbon => {
    // Toggle visibility based on the checkbox state
    ribbon.style.display = isVisible ? '' : 'none';
  });

  // Additionally, toggle visibility of events in the popup
  const popupSelectorString = `.event-popup ul li[data-calendar-id="${calendarId}"]`;
  const popupEvents = document.querySelectorAll(popupSelectorString);
  popupEvents.forEach(event => {
    event.style.display = isVisible ? '' : 'none';
  });

  browser.runtime.sendMessage({
    action: "saveCalendarVisibilityState",
    calendarId: calendarId,
    isVisible: isVisible
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Notify the background script that the content script is ready
  console.log("DOM fully loaded. Notifying background script...");
  browser.runtime.sendMessage({ action: "contentScriptReady" });


})

function getCalendarInfoById(calendarId) {
  const calendarList = document.getElementById('calendar-list');
  const listItems = calendarList.querySelectorAll('li[data-id]'); // Get all list items with a data-id attribute
  let calendarColor = '#C1C1C1'; 
  let calendarName = '';

  listItems.forEach(item => {
    if (item.getAttribute('data-id') === calendarId.toString()) {
      calendarColor = item.getAttribute('data-color');
      calendarName = item.getAttribute('data-name');
    }
  });

  return {
    color: calendarColor,
    name: calendarName
  };
}





function parseEventDate(dateString) {
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(dateString.substring(6, 8), 10);

  let date;
  let includesTime = false;

  // Check if dateString includes time
  if (dateString.length > 8) {
    const hours = parseInt(dateString.substring(9, 11), 10);
    const minutes = parseInt(dateString.substring(11, 13), 10);
    const seconds = dateString.length > 13 ? parseInt(dateString.substring(13, 15), 10) : 0;
    date = new Date(year, month, day, hours, minutes, seconds);
    includesTime = true;
  } else {
    // If dateString does not include time, return a date with default time 00:00:00
    date = new Date(year, month, day);
  }

  return {
    date: date,
    includesTime: includesTime
  };
}

function displayCalendarEvents() {
  let events = StoredEvents;
  if (!events) {
    console.error("StoredEvents is null or undefined");
    return;
  }
  console.log("Displaying calendar events");
  events.forEach(event => {
    const calendarListItem = document.querySelector(`li[data-id="${event.calendarId}"]`);
    if (!calendarListItem) {
      console.error("Could not find calendar list item for event: ", event);
      return;
    }

    const calendarColor = calendarListItem ? calendarListItem.getAttribute('data-color') : '#defaultColor';
    const checkbox = calendarListItem.querySelector('input[type="checkbox"]');
    const isVisible = checkbox ? checkbox.checked : false;

    const eventStartDate = parseEventDate(event.startDate);
    const year = eventStartDate.date.getFullYear();
    const formattedStartMonth = eventStartDate.date.toLocaleString('en-US', { month: '2-digit' });
    const formattedStartDay = eventStartDate.date.toLocaleString('en-US', { day: '2-digit' });
    const formattedStartTime = eventStartDate.includesTime ? eventStartDate.date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

    const eventEndDate = parseEventDate(event.endDate);
    const formattedEndMonth = eventEndDate.date.toLocaleString('en-US', { month: '2-digit' });
    const formattedEndDay = eventEndDate.date.toLocaleString('en-US', { day: '2-digit' });
    const formattedEndTime = eventEndDate.includesTime ? eventEndDate.date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

    const calendarInfo = getCalendarInfoById(event.calendarId);
    const calendarEl = document.getElementById('calendar');
    const formattedStartDate = `${year}-${formattedStartMonth}-${formattedStartDay}`;
    const dayCell = calendarEl.querySelector(`.day[data-date="${formattedStartDate}"]`);

    if (dayCell) {
      const eventRibbon = document.createElement('div');
      eventRibbon.className = 'event-ribbon';
      eventRibbon.textContent = event.title;
      eventRibbon.style.backgroundColor = calendarColor;
      eventRibbon.style.display = isVisible ? '' : 'none';
      eventRibbon.setAttribute('data-title', event.title);
      eventRibbon.setAttribute('data-description', event.description);
      eventRibbon.setAttribute('data-start-date', event.startDate);
      eventRibbon.setAttribute('data-end-date', event.endDate);
      eventRibbon.setAttribute('data-formattedStartMonth', formattedStartMonth);
      eventRibbon.setAttribute('data-formattedStartDay', formattedStartDay);
      eventRibbon.setAttribute('data-formattedEndMonth', formattedEndMonth);
      eventRibbon.setAttribute('data-formattedEndDay', formattedEndDay);
      eventRibbon.setAttribute('data-formatted-start-time', formattedStartTime);
      eventRibbon.setAttribute('data-formatted-end-time', formattedEndTime);
      eventRibbon.setAttribute('data-calendar-name', calendarInfo.name); 
      eventRibbon.setAttribute('data-calendar-id', event.calendarId); // Assign calendar ID to each event ribbon

      dayCell.appendChild(eventRibbon);

      // Check if popup already exists
      let popup = document.querySelector(`div.event-popup[data-start-date="${formattedStartDate}"]`);
      if (!popup) {
        // If it doesn't exist, create it
        popup = document.createElement('div');
        popup.className = 'event-popup';
        popup.setAttribute('data-start-date', formattedStartDate);
        popup.style.display = 'none'; // Initially hidden
        // Positioning now handled by JavaScript
        popup.innerHTML = `<strong>${formattedStartDate}</strong><ul></ul>`;
        // Append the popup inside the div with ID 'calendar' as the last child
        const calendarDiv = document.getElementById('calendar');
        calendarDiv.appendChild(popup);
      }
      
      // Whether the popup was just created or already existed, append the event details
      const ul = popup.querySelector('ul');
      const li = document.createElement('li');
      li.setAttribute('data-calendar-id', event.calendarId);
      let contentString = `${event.title}`;
      if (event.description) {
        contentString += `: ${event.description}`;
      }
      contentString += `. ${formattedStartTime}`;
      if (formattedEndTime) {
          contentString += ` / ${formattedEndTime}`;
      }
      li.innerHTML = contentString;
      li.style.display = isVisible ? '' : 'none';
      ul.appendChild(li);
    }
  });
}
function applyStoredCalendarVisibilityStates(calendarVisibilityStates) {
  console.log("Applying stored calendar visibility states...", calendarVisibilityStates);
  // Logic to apply the visibility states
  Object.keys(calendarVisibilityStates).forEach(calendarId => {
    const isVisible = calendarVisibilityStates[calendarId];
    toggleCalendarEvents(calendarId, isVisible); // Assuming this is a function that handles the UI update
  });

  // After applying visibility states, check each popup for visible items
  const allPopups = document.querySelectorAll('.event-popup');
  allPopups.forEach(popup => {
    const visibleItems = popup.querySelectorAll('ul li:not([style*="display: none"])');
    if (visibleItems.length === 0) {
      popup.setAttribute('data-disable-mouseover', 'true');
    } else {
      popup.removeAttribute('data-disable-mouseover');
    }
  });
}

function updatePopupMouseoverFunctionality() {
  const allPopups = document.querySelectorAll('.event-popup');
  allPopups.forEach(popup => {
    const visibleItems = popup.querySelectorAll('ul li:not([style*="display: none"])');
    if (visibleItems.length === 0) {
      popup.setAttribute('data-disable-mouseover', 'true');
    } else {
      popup.removeAttribute('data-disable-mouseover');
    }
  });
}
function showLoadingPopup() {
    // Create an overlay
      const overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
      overlay.style.zIndex = '999'; // Just below the popup to cover other items
  
    // Create the popup
    const loadingPopup = document.createElement('div');
    loadingPopup.id = 'loading-popup';
    loadingPopup.textContent = 'Fetching events for that year...';
    loadingPopup.style.position = 'fixed'; // Use fixed positioning
    loadingPopup.style.top = '50%'; // Center vertically
    loadingPopup.style.left = '50%'; // Center horizontally
    loadingPopup.style.transform = 'translate(-50%, -50%)'; // Adjust the position to truly center
    loadingPopup.style.backgroundColor = '#fff'; // Background color
    loadingPopup.style.padding = '20px'; // Padding
    loadingPopup.style.borderRadius = '5px'; // Rounded corners
    loadingPopup.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'; // Box shadow for a subtle "lifted" effect
    loadingPopup.style.zIndex = '1000'; // Ensure it's above other content
    document.body.appendChild(loadingPopup);
    document.body.appendChild(overlay);
}

function hideLoadingPopup() {
    const loadingPopup = document.getElementById('loading-popup');
    const overlay = document.getElementById('loading-overlay');
    if (loadingPopup) {
      document.body.removeChild(loadingPopup);
  }
  if (overlay) {
      document.body.removeChild(overlay);
  }
}