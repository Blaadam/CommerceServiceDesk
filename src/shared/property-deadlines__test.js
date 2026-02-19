const DEADLINE_DAY_OFFSET = 7;

function getNextDeadline(currentDate) {
    // 1. Get the initial target date (e.g., the last day of the month)
    const deadlineDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    return {
        day: deadlineDay.getDate(),
        month: deadlineDay.getMonth(),
        year: deadlineDay.getFullYear(),
    };
}

function getNoticeDate(deadline) {
    // Create a date object from the deadline
    const date = new Date(deadline.year, deadline.month, deadline.day);

    // Move the date back by the offset, should be 1 week before the deadline
    date.setDate(date.getDate() - DEADLINE_DAY_OFFSET);

    return {
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
    };
}

console.log(getNextDeadline(new Date()));
console.log(getNoticeDate(getNextDeadline(new Date())));