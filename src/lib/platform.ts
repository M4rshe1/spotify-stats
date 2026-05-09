/**
 * Converts a raw platform/device string to a canonical platform name.
 * @param platform The platform string (usually a UserAgent or device label)
 * @returns The canonical platform name (e.g., "Google", "Android", "iOS", "Web", "Sonos", "Windows", etc)
 */

export function platform(platform: string): string {
  if (!platform) return "Unknown";

  //   const platformMatchers: [RegExp, string][] = [
  //     [/(google|nest hub|cast)/i, "Google"],
  //     [/(android|linux.*android)/i, "Android"],
  //     [/(ipad|iphone|ios)/i, "iOS"],
  //     [/(win|windows)/i, "Windows"],
  //     [/(mac\s?os|os x|darwin)/i, "Mac"],
  //     [/(web|chrome|firefox|safari|edge)/i, "Web"],
  //     [/(sonos)/i, "Sonos"],
  //     [/(alexa|echo|voice)/i, "Alexa"],
  //     [/(tv|chromecast)/i, "TV"],
  //     [/(playstation|ps4|ps5)/i, "PlayStation"],
  //     [/(xbox)/i, "Xbox"],
  //     [/(linux)/i, "Linux"],
  //     [/(roku)/i, "Roku"],
  //     [/(car|auto)/i, "Car"],
  //   ];

  const platformMatchers: [RegExp, string][] = [
    [/(web|chrome|firefox|safari|edge)/i, "Web"],
    [/(android|linux.*android|ipad|iphone|ios)/i, "Smartphone"],
    [/(google|nest hub|cast|alexa|echo|voice)/i, "Cast Device"],
    [/(win|windows|mac\s?os|os x|darwin|linux)/i, "Computer"],
    [/(sonos)/i, "Sonos"],
    [/(tv|chromecast)/i, "TV"],
    [/(playstation|ps4|ps5)/i, "PlayStation"],
    [/(xbox)/i, "Xbox"],
    [/(roku)/i, "Roku"],
    [/(car|auto)/i, "Car"],
  ];

  for (const [regex, name] of platformMatchers) {
    if (regex.test(platform)) return name;
  }

  return "Unknown";
}
