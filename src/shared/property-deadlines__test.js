const DEADLINE_DAY_OFFSET = 7;

function getNextDeadline(currentDate) {
    // 1. Get the initial target date (e.g., the last day of the month)
    const deadlineDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, DEADLINE_DAY_OFFSET);

    // 2. Calculate how many days to move to hit the previous Saturday
    // .getDay() returns 0 (Sun) to 6 (Sat)
    const currentDayOfWeek = deadlineDay.getDay();

    // If it's already Saturday (6), adjustment is 0. 
    // If it's Sunday (0), we go back 1 day.
    // If it's Friday (5), we go back 6 days to hit the previous Saturday.
    const daysToSubtract = (currentDayOfWeek + 1) % 7;

    deadlineDay.setDate(deadlineDay.getDate() - daysToSubtract);

    return {
        day: deadlineDay.getDate(),
        month: deadlineDay.getMonth(),
        year: deadlineDay.getFullYear(),
    };
}

function getNoticeDate(deadline) {
    // Create a date object from the deadline
    const date = new Date(deadline.year, deadline.month, deadline.day);

    // Move the date back by the offset * 2, should be 2 weeks before the deadline
    date.setDate(date.getDate() - DEADLINE_DAY_OFFSET * 2);

    return {
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
    };
}

console.log(getNextDeadline(new Date()));
console.log(getNoticeDate(getNextDeadline(new Date())));