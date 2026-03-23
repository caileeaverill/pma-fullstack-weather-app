/** Short, human-readable guidance from current conditions */
export function getSkyTip(input: {
  weatherCode: number
  tempC: number
  humidityPct: number
  precipProbNextDay?: number
  windKmh: number
}): string {
  const { weatherCode, tempC, humidityPct, precipProbNextDay, windKmh } = input
  const tips: string[] = []

  if (precipProbNextDay != null && precipProbNextDay >= 50) {
    tips.push("Rain is likely in the next day or two—keep a layer handy.")
  } else if (precipProbNextDay != null && precipProbNextDay >= 25) {
    tips.push("A chance of showers—worth checking the hourly view before plans.")
  }

  if (tempC <= 5) {
    tips.push("Cold air—gloves and a wind layer help more than you think.")
  } else if (tempC >= 28) {
    tips.push("Heat stress risk—hydrate and seek shade during midday.")
  }

  if (humidityPct >= 75 && tempC >= 18) {
    tips.push("Humid and warm—pace yourself outdoors.")
  } else if (humidityPct <= 30) {
    tips.push("Dry air—lip balm and water are easy wins.")
  }

  if (windKmh >= 35) {
    tips.push("Breezy—secure loose items and expect wind chill.")
  }

  if (weatherCode >= 95) {
    tips.push("Thunder possible—avoid exposed high ground until it clears.")
  }

  if (tips.length === 0) {
    return "Conditions look fairly steady—great day to be outside with normal prep."
  }
  return tips.slice(0, 3).join(" ")
}
