// Utility to clear localStorage for demonstration
// You can run this in browser console: clearArogyaSumanData()

export const clearArogyaSumanData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('arogyasuman_reports')
    console.log('ArogyaSuman dashboard data cleared')
    window.location.reload()
  }
}

// Make it available globally for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).clearArogyaSumanData = clearArogyaSumanData
}