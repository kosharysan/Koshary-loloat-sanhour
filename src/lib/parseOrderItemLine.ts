/** DishBuilder custom tagine — not regular menu items whose names contain "طاجن". */
export function isCustomDishOrderLine(nameAndDetails: string, detailsStr: string): boolean {
  if (nameAndDetails.includes('طاجن مبتكر خاص')) return true;
  return (
    detailsStr.includes('الأساس:') ||
    detailsStr.includes('أساس:') ||
    detailsStr.includes('البروتين:') ||
    detailsStr.includes('بروتين:') ||
    detailsStr.includes('درجة الشطة:')
  );
}

export function displayNameFromOrderLine(nameAndDetails: string, detailsStr: string): string {
  return isCustomDishOrderLine(nameAndDetails, detailsStr)
    ? 'طاجن مبتكر خاص'
    : nameAndDetails.trim();
}
