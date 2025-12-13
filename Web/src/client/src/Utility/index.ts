/**
 * Formats a Date object or timestamp string into a readable time string.
 *
 * @param ts - The timestamp to format.
 * @return Formatted time string (HH:MM:SS).
 */
export const formatTimestamp = (ts: string | Date): string => {
	return new Date(ts).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
}
