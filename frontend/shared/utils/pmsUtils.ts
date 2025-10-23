import { Property } from '../api/dynamic';

/**
 * Utility function to check if a property has PMS configured
 * Checks both pms (ForeignKey) and pms_name (CharField) fields
 * @param property - The property object to check
 * @returns boolean - true if property has PMS configured, false otherwise
 */
export function hasPMSConfigured(property: Property | null | undefined): boolean {
  if (!property) return false;
  
  // Check if property has either a PMS system (ForeignKey) or PMS name (CharField)
  return !!(property.pms || property.pms_name);
}

/**
 * Utility function to get the PMS name for display
 * @param property - The property object
 * @returns string - The PMS name or "No PMS" if none configured
 */
export function getPMSName(property: Property | null | undefined): string {
  if (!property) return "No PMS";
  
  // Return PMS system name if available, otherwise PMS name field, otherwise "No PMS"
  if (property.pms?.name) {
    return property.pms.name;
  }
  
  if (property.pms_name) {
    return property.pms_name;
  }
  
  return "No PMS";
}
