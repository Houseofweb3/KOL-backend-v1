export const normalizeName = (name: string) => name.replace(/\s+/g, '').toLowerCase();

// Helper functions for date handling
export function getDatesInRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    let currentDate = getStartOfDay(new Date(startDate));
    const lastDate = getStartOfDay(new Date(endDate));
    
    while (currentDate <= lastDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

export function getStartOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

export function getStartDateFromTimeRange(timeRange: string): Date {
    const currentDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
        case '7D':
            startDate.setDate(currentDate.getDate() - 7);
            break;
        case '1M':
            startDate.setMonth(currentDate.getMonth() - 1);
            break;
        case '3M':
            startDate.setMonth(currentDate.getMonth() - 3);
            break;
        case '6M':
            startDate.setMonth(currentDate.getMonth() - 6);
            break;
        default:
            startDate.setDate(currentDate.getDate() - 7); // Default to 7 days
    }

    return startDate;
}

export const formatClientAddress = (address: Record<string, string>): string => {
  // Filter out empty values
  const validValues = Object.values(address).filter(value => 
    value !== undefined && 
    value !== null && 
    value.trim() !== ''
  );
  
  // Join all valid values with commas
  return validValues.join(', ');
};
