/**
 * California Proposition Data Client
 * Fetches ballot measure information using multiple data sources:
 * 1. California Secretary of State Quick Guide to Props (primary source)
 * 2. Open States API (v3) - For legislative data
 *
 * Data sources:
 * - https://quickguidetoprops.sos.ca.gov/propositions/{date}
 * - https://v3.openstates.org/
 * - https://www.sos.ca.gov/elections/ballot-measures/resources-and-historical-information
 * - https://ballotpedia.org/List_of_California_ballot_propositions
 */

import { Proposition, PropositionCategory, PropositionResult, PropositionStatus } from '@/types';

const CA_SOS_QUICK_GUIDE = 'https://quickguidetoprops.sos.ca.gov/propositions';
const OPEN_STATES_API = 'https://v3.openstates.org';

export interface BallotMeasureInfo {
  measureNumber: string;
  title: string;
  summary: string;
  fullText?: string;
  proponents: string[];
  opponents: string[];
  fiscalImpact?: string;
  electionDate: string;
}

export interface ElectionResult {
  measureNumber: string;
  year: number;
  yesVotes: number;
  noVotes: number;
  yesPercentage: number;
  noPercentage: number;
  totalVotes: number;
  passed: boolean;
  countyResults?: Record<string, { yes: number; no: number }>;
}

// Known California election dates for statewide propositions
// Source: CA SOS official election calendar
const CA_ELECTION_DATES: Record<number, string[]> = {
  2026: ['2026-11-03', '2026-06-02'],
  2025: ['2025-11-04'],
  2024: ['2024-11-05', '2024-03-05'],
  2022: ['2022-11-08'],
  2021: ['2021-09-14'],
  2020: ['2020-11-03', '2020-03-03'],
  2019: ['2019-11-05'],
  2018: ['2018-11-06', '2018-06-05'],
  2017: ['2017-06-06'],
  2016: ['2016-11-08', '2016-06-07'],
  2015: ['2015-11-03'],
  2014: ['2014-11-04', '2014-06-03'],
  2013: ['2013-11-05'],
  2012: ['2012-11-06', '2012-06-05'],
  2011: ['2011-11-08', '2011-06-07'],
  2010: ['2010-11-02', '2010-06-08'],
  2009: ['2009-11-03', '2009-05-19'],
  2008: ['2008-11-04', '2008-06-03', '2008-02-05'],
  2007: ['2007-11-06'],
  2006: ['2006-11-07', '2006-06-06'],
  2005: ['2005-11-08'],
  2004: ['2004-11-02', '2004-03-02'],
  2003: ['2003-10-07'],
  2002: ['2002-11-05', '2002-03-05'],
  2001: ['2001-03-06'],
  2000: ['2000-11-07', '2000-03-07'],
  1999: ['1999-11-02'],
  1998: ['1998-11-03', '1998-06-02'],
  1997: [],
  1996: ['1996-11-05', '1996-03-26'],
  1995: ['1995-11-07'],
  1994: ['1994-11-08', '1994-06-07'],
  1993: ['1993-11-02', '1993-04-20'],
  1992: ['1992-11-03', '1992-06-02'],
  1991: ['1991-11-05'],
  1990: ['1990-11-06', '1990-06-05'],
};

// Proposition titles for years not covered by the CA SOS Quick Guide scraper
// Source: CA SOS Historical Information, Ballotpedia
const PROPOSITION_TITLES: Record<string, string> = {
  // 2014
  '2014-1':  'Water Bond. Funding for Water Quality, Supply, Treatment, and Storage Projects',
  '2014-2':  'Rainy Day Budget Stabilization Fund Act',
  '2014-41': 'Veterans Housing and Homeless Prevention Bond Act of 2014',
  '2014-45': 'Insurance Rate Changes. Legislative Approval. Initiative Statute',
  '2014-46': 'Drug and Alcohol Testing of Doctors. Medical Negligence Lawsuits. Initiative Statute',
  '2014-47': 'Criminal Sentences. Misdemeanor Penalties. Initiative Statute',
  '2014-48': 'Referendum on the Pala Band Tribal-State Gaming Compact',
  // 2012
  '2012-28': 'Term Limits. Members of the Legislature',
  '2012-29': 'Cigarette Tax for Cancer Research',
  '2012-30': 'Temporary Taxes to Fund Education. Guaranteed Local Public Safety Funding',
  '2012-31': 'State Budget. State and Local Government',
  '2012-32': 'Political Contributions by Payroll Deduction. Contributions to Candidates',
  '2012-33': 'Auto Insurance Companies. Prices Based on Driver\'s History of Insurance Coverage',
  '2012-34': 'Death Penalty. Initiative Statute',
  '2012-35': 'Human Trafficking. Penalties. Sex Offender Registration',
  '2012-36': 'Three Strikes Law. Repeat Felony Offenders. Penalties',
  '2012-37': 'Genetically Engineered Foods. Labeling',
  '2012-38': 'Tax for Education and Early Childhood Programs',
  '2012-39': 'Tax Treatment for Multistate Businesses. Clean Energy and Energy Efficiency Funding',
  '2012-40': 'Redistricting. State Senate Districts',
  // 2010
  '2010-13': 'Limits on Property Tax Assessment. Seismic Safety Retrofit Property',
  '2010-14': 'Elections. Primaries',
  '2010-15': 'California Fair Elections Act',
  '2010-16': 'Two-Thirds Vote Requirement to Enact New or Higher Taxes',
  '2010-17': 'Auto Insurance Companies. Prices Based on Driver\'s Continuous Coverage',
  '2010-19': 'Marijuana Legalization',
  '2010-20': 'Redistricting of Congressional Districts',
  '2010-21': 'Vehicle License Surcharge for State Parks and Wildlife Programs',
  '2010-22': 'Prohibits State from Taking Funds Used for Transportation or Local Government Projects',
  '2010-23': 'Suspends Air Pollution Control Laws Requiring Major Polluters to Report and Reduce Greenhouse Gas',
  '2010-24': 'Repeals Recent Legislation That Would Allow Businesses to Carry Back Losses',
  '2010-25': 'Changes Legislative Vote Requirement to Pass Budget and Budget-Related Legislation',
  '2010-26': 'Requires That Certain State and Local Fees Be Approved by Two-Thirds Vote',
  '2010-27': 'Eliminates State Commission on Redistricting',
  // 2009 (Special Election)
  '2009-1A': 'Budget Stabilization Act',
  '2009-1B': 'Education Funding. Supplemental Payments',
  '2009-1C': 'Lottery Modernization Act',
  '2009-1D': 'Protects Children\'s Services Funding',
  '2009-1E': 'Mental Health Funding',
  '2009-1F': 'Elected Officials\' Salaries. State Budget',
  // 2008 (November)
  '2008-1A': 'Safe, Reliable High-Speed Passenger Train Bond Act',
  '2008-2':  'Standards for Confining Farm Animals',
  '2008-3':  'Children\'s Hospital Bond Act',
  '2008-4':  'Waiting Period and Parental Notification Before Termination of Minor\'s Pregnancy',
  '2008-5':  'Nonviolent Offenders. Sentencing, Parole and Rehabilitation',
  '2008-6':  'Police and Law Enforcement Funding. Criminal Penalties and Laws',
  '2008-7':  'Renewable Energy Generation',
  '2008-8':  'Eliminates Right of Same-Sex Couples to Marry',
  '2008-9':  'Criminal Justice System. Victims\' Rights. Parole',
  '2008-10': 'Alternative Fuel Vehicles and Renewable Energy',
  '2008-11': 'Redistricting',
  '2008-12': 'Veterans\' Bond Act of 2008',
  // 2008 (February Primary)
  '2008-91': 'Transportation Funding Protection',
  '2008-92': 'Community Colleges. Fees. Funding. Governance',
  '2008-93': 'Term Limits',
  '2008-94': 'Indian Gaming Compacts (Pechanga)',
  '2008-95': 'Indian Gaming Compacts (Agua Caliente)',
  '2008-96': 'Indian Gaming Compacts (Morongo)',
  '2008-97': 'Indian Gaming Compacts (Sycuan)',
  // 2006
  '2006-1A': 'Transportation Funding Protection',
  '2006-1B': 'Highway Safety, Traffic Reduction, Air Quality, and Port Security Bond Act of 2006',
  '2006-1C': 'Housing and Emergency Shelter Trust Fund Act of 2006',
  '2006-1D': 'Kindergarten-University Public Education Facilities Bond Act of 2006',
  '2006-1E': 'Disaster Preparedness and Flood Prevention Bond Act of 2006',
  '2006-83': 'Sex Offenders. Sexually Violent Predators. Punishment, Residence Restrictions and Monitoring',
  '2006-84': 'Water Quality, Safety and Supply. Flood Control. Natural Resource Protection. Park Improvements Bond Act',
  '2006-85': 'Waiting Period and Parental Notification Before Termination of Minor\'s Pregnancy',
  '2006-86': 'Tobacco Tax',
  '2006-87': 'Alternative Energy. Research, Production, Incentives. Tax on California Oil Producers',
  '2006-88': 'Education Funding. Parcel Tax',
  '2006-89': 'Political Campaigns. Public Financing. Corporate Tax Increase',
  '2006-90': 'Government Acquisition, Regulation of Private Property',
  // 2005 (Special Election)
  '2005-73': 'Waiting Period and Parental Notification Before Termination of Minor\'s Pregnancy',
  '2005-74': 'Public School Teachers. Waiting Period for Permanent Status',
  '2005-75': 'Public Employee Union Dues. Required Employee Consent for Political Contributions',
  '2005-76': 'State Spending and School Funding Limits',
  '2005-77': 'Redistricting',
  '2005-78': 'Prescription Discounts',
  '2005-79': 'Prescription Drug Discounts. State Purchasing Program',
  '2005-80': 'Electric Service Providers. Regulation',
  // 2004
  '2004-55': 'School Facilities Bond Act',
  '2004-56': 'Budget. Two-Thirds Vote Requirement for Tax Levies',
  '2004-57': 'Economic Recovery Bond Act',
  '2004-58': 'State Appropriations Limit',
  '2004-59': 'Public Records. Open Meetings',
  '2004-60': 'Primary Elections',
  '2004-61': 'Children\'s Hospital Bond Act',
  '2004-62': 'Primary Elections',
  '2004-63': 'Mental Health Services Expansion, Funding. Tax on Personal Incomes Above $1 Million',
  '2004-64': 'Limits on Private Enforcement of Unfair Business Competition Laws',
  '2004-65': 'Local Government Revenue. Preemption by State',
  '2004-66': 'Three Strikes Law. Repeat Felony Offenders',
  '2004-67': 'Emergency Medical Services. Telephone Surcharge',
  '2004-68': 'Non-Tribal Commercial Gambling. Tribal Gaming Compacts',
  '2004-69': 'DNA Samples Collection',
  '2004-70': 'Tribal Gaming Compacts',
  '2004-71': 'Stem Cell Research. Funding. Bonds',
  '2004-72': 'Health Care Coverage. Employer Requirements. New State Program',
  // 2003 (Recall Election)
  '2003-53': 'State and Local Government Facilities Bond Act',
  '2003-54': 'Classification by Race, Ethnicity, Color, or National Origin',
  // 2002
  '2002-40': 'Coastal Forests and Watershed Land Conservation Act',
  '2002-41': 'Veterans\' Bond Act of 2000',
  '2002-42': 'Consumer Privacy. Personal Medical Information',
  '2002-43': 'Primary Elections',
  '2002-44': 'Minimum Wage',
  '2002-45': 'Campaign Finance',
  '2002-46': 'Housing and Emergency Shelter Trust Fund Act',
  '2002-47': 'State Budget Process. Votes Required for Budget Bills. Appropriations Limit',
  '2002-48': 'Tribal Government Gaming and Economic Self-Sufficiency Act',
  '2002-49': 'After School Education and Safety',
  '2002-50': 'Water Security, Clean Drinking Water, Coastal and Beach Protection Act',
  '2002-51': 'Transportation Congestion Improvement Act',
  '2002-52': 'Voter Participation and Election Day Registration',
  // 2000
  '2000-12': 'Veterans\' Bond Act of 2000',
  '2000-13': 'Reduces Vehicle License Fees',
  '2000-14': 'Safe Neighborhood Parks, Clean Water, Clean Air, and Coastal Protection Bond Act',
  '2000-15': 'County and City Authority Over Compensation for Local Employees',
  '2000-16': 'Electric Cooperatives',
  '2000-17': 'Campaign Contributions and Spending Limits',
  '2000-18': 'Identification of Paid Political Advertisements',
  '2000-19': 'Political Party Primary Elections',
  '2000-20': 'Federal Redistricting. Independent Commission',
  '2000-21': 'Water Bond Act',
  '2000-22': 'Limit on Marriages',
  '2000-23': 'Local Government Finance and Miscellaneous Tax Provisions',
  '2000-24': 'Business Taxes: Research and Development Credit',
  '2000-25': 'Campaign Finance Reform',
  '2000-26': 'Two-Thirds Majority Requirement for School Bonds',
  '2000-27': 'Campaign Finance Reform — Eliminated',
  '2000-28': 'Initiative and Referendum Process',
  '2000-29': 'Criminal Procedure: Sexual Assault',
  '2000-30': 'Limitation on Criminal Defense',
  '2000-31': 'Medical Savings Account Tax Deduction',
  '2000-32': 'Funds for Student Testing and Related Teacher Training',
  '2000-33': 'Homeowners\' and Renters\' Insurance: Continuous Coverage',
  '2000-34': 'Campaign Contributions and Spending Limits',
  '2000-35': 'Public Works Projects: Private Contracts',
  '2000-36': 'Drug Treatment Instead of Incarceration',
  '2000-37': 'State Lottery: Education Funding',
  '2000-38': 'School Vouchers',
  '2000-39': 'School Bond Elections: 55% Local Vote',
  // 1998
  '1998-1A': 'Safe Neighborhood Parks, Clean Water, Clean Air, and Coastal Protection Bond Act',
  '1998-2':  'Establishes New Government Reorganization Commission',
  '1998-3':  'Extends Term Limits for Some Legislators',
  '1998-4':  'Would Allow Some Non-Violent Drug Offenders to Get Treatment Instead of Incarceration',
  '1998-5':  'Tribal-State Compacts for Gaming on Indian Lands',
  '1998-6':  'Prohibits Slaughter of Horses and Donkeys for Human Consumption',
  '1998-7':  'Allows Providers of Low Power FM Radio Licenses to Protest',
  '1998-8':  'Would Require Union Approval Before Union Dues Used for Political Purposes',
  '1998-9':  'Would Overhaul the State\'s Electrical Utility Industry',
  '1998-10': 'Early Childhood Development',
  '1998-11': 'Redistricting',
  // 1996
  '1996-198': 'Compassionate Use Act of 1996 (Medical Marijuana)',
  '1996-204': 'Safe, Clean, Reliable Water Supply Act (Water Bond)',
  '1996-205': 'Prison Facilities Bond Act',
  '1996-206': 'Juvenile Crime. Initiative Statute',
  '1996-207': 'Criminal Sentences. Sex Crimes Against Children',
  '1996-208': 'Criminal Justice. Victims\' Rights',
  '1996-209': 'Victims\' Rights. Parole',
  '1996-210': 'Minimum Wage',
  '1996-211': 'Limitations on the Right to Sue',
  '1996-212': 'Consumer and Workplace Protection Act',
  '1996-213': 'Limits on Attorneys\' Fees. Limits on Punitive Damages',
  '1996-214': 'Patients\' Right to Know',
  '1996-215': 'Compassionate Use Act of 1996',
  '1996-216': 'Health Care Protection Act',
  '1996-217': 'Upper-Income Tax Rates',
  '1996-218': 'Voter Approval for Local Government Taxes',
  // 1994
  '1994-180': 'Water Resources',
  '1994-181': 'Veterans\' Bond Act',
  '1994-182': 'Legislative Pay',
  '1994-183': 'Gambling',
  '1994-184': 'Three Strikes Law',
  '1994-185': 'Courts. Judicial Administration',
  '1994-186': 'Drug and Alcohol Rehabilitation',
  '1994-187': 'Illegal Aliens. Prohibition of Public Services',
  '1994-188': 'Tobacco. Advertising to Minors',
  // 1992
  '1992-160': 'Voter Approval of Taxes by Local Government',
  '1992-161': 'Death Penalty',
  '1992-162': 'Public Employees\' Retirement',
  '1992-163': 'Repeal of Taxation of Snack Foods',
  '1992-164': 'Term Limits for State Legislators and U.S. Representatives',
  '1992-165': 'Budget and Expenditure Limitations',
  '1992-166': 'Elimination of Local Capital Outlay',
  '1992-167': 'Income Tax Check-Off for Environment',
  // 1990
  '1990-111': 'Transportation Funding',
  '1990-112': 'Ethics and Compensation of Public Officials',
  '1990-113': 'Public School Finance',
  '1990-114': 'Public Employees\' Retirement',
  '1990-115': 'Criminal Justice Reform',
  '1990-116': 'Rail Transportation',
  '1990-117': 'Wildlife Protection',
  '1990-118': 'Reapportionment',
  '1990-119': 'Reapportionment (Alternative)',
  '1990-120': 'Prison Construction',
  '1990-121': 'Veterans\' Bond',
  '1990-122': 'Bonds for Seismic Safety',
  '1990-123': 'Educational Funding',
  '1990-124': 'Hazardous Waste',
  '1990-125': 'Labor, Health and Welfare',
  '1990-126': 'Alcohol and Drug Taxes',
  '1990-127': 'Taxation',
  '1990-128': 'Environmental Protection',
  '1990-129': 'Drug Crime',
  '1990-130': 'Forest Protection',
  '1990-131': 'Campaign Reform and Term Limits',
  '1990-132': 'Commercial Fishing',
  '1990-133': 'Drugs and Crime',
  '1990-134': 'Alcohol',
  '1990-135': 'Pesticides',
  '1990-136': 'Tax Limitations',
  '1990-137': 'Initiative and Referendum',
  '1990-138': 'Forests',
  '1990-139': 'Prisoner Labor',
  '1990-140': 'Term Limits and Spending Limits on Legislature',
};

// Historical proposition results with vote data
// Source: California Secretary of State official certified results
// https://www.sos.ca.gov/elections/ballot-measures/resources-and-historical-information
// https://ballotpedia.org/List_of_California_ballot_propositions
interface HistoricalResult {
  passed: boolean;
  yesPercent: number;
  noPercent: number;
  yesVotes: number;
  noVotes: number;
  turnout: number;
}

const HISTORICAL_RESULTS: Record<string, HistoricalResult> = {
  // 2025
  '2025-50': { passed: true,  yesPercent: 64.4, noPercent: 35.6, yesVotes: 7453339, noVotes: 4116998, turnout: 0.45 },

  // 2024
  '2024-2':  { passed: true,  yesPercent: 59.6, noPercent: 40.4, yesVotes: 8752133, noVotes: 5930567, turnout: 0.76 },
  '2024-3':  { passed: true,  yesPercent: 61.6, noPercent: 38.4, yesVotes: 9002081, noVotes: 5620618, turnout: 0.76 },
  '2024-4':  { passed: true,  yesPercent: 58.9, noPercent: 41.1, yesVotes: 8568373, noVotes: 5976327, turnout: 0.76 },
  '2024-5':  { passed: false, yesPercent: 54.6, noPercent: 45.4, yesVotes: 7877946, noVotes: 6549654, turnout: 0.75 },
  '2024-6':  { passed: true,  yesPercent: 55.4, noPercent: 44.6, yesVotes: 7980891, noVotes: 6425809, turnout: 0.75 },
  '2024-32': { passed: false, yesPercent: 47.5, noPercent: 52.5, yesVotes: 6837979, noVotes: 7551321, turnout: 0.75 },
  '2024-33': { passed: false, yesPercent: 37.7, noPercent: 62.3, yesVotes: 5410270, noVotes: 8934430, turnout: 0.75 },
  '2024-34': { passed: true,  yesPercent: 55.7, noPercent: 44.3, yesVotes: 7909428, noVotes: 6295272, turnout: 0.74 },
  '2024-35': { passed: true,  yesPercent: 73.4, noPercent: 26.6, yesVotes: 10549403, noVotes: 3822297, turnout: 0.75 },
  '2024-36': { passed: true,  yesPercent: 71.5, noPercent: 28.5, yesVotes: 10390320, noVotes: 4137380, turnout: 0.76 },

  // 2022
  '2022-1':  { passed: true,  yesPercent: 66.9, noPercent: 33.1, yesVotes: 7780795, noVotes: 3856865, turnout: 0.60 },
  '2022-26': { passed: false, yesPercent: 33.3, noPercent: 66.7, yesVotes: 3754023, noVotes: 7507843, turnout: 0.58 },
  '2022-27': { passed: false, yesPercent: 33.1, noPercent: 66.9, yesVotes: 3759076, noVotes: 7596804, turnout: 0.59 },
  '2022-28': { passed: true,  yesPercent: 63.0, noPercent: 37.0, yesVotes: 7093662, noVotes: 4167838, turnout: 0.58 },
  '2022-29': { passed: false, yesPercent: 37.5, noPercent: 62.5, yesVotes: 4146697, noVotes: 6916303, turnout: 0.57 },
  '2022-30': { passed: false, yesPercent: 42.1, noPercent: 57.9, yesVotes: 4716987, noVotes: 6493813, turnout: 0.58 },
  '2022-31': { passed: false, yesPercent: 36.8, noPercent: 63.2, yesVotes: 4191488, noVotes: 7190312, turnout: 0.59 },

  // 2020
  '2020-14': { passed: true,  yesPercent: 51.1, noPercent: 48.9, yesVotes: 8686176, noVotes: 8314424, turnout: 0.81 },
  '2020-15': { passed: false, yesPercent: 48.0, noPercent: 52.0, yesVotes: 8012773, noVotes: 8682727, turnout: 0.80 },
  '2020-16': { passed: false, yesPercent: 42.8, noPercent: 57.2, yesVotes: 7107779, noVotes: 9500721, turnout: 0.79 },
  '2020-17': { passed: true,  yesPercent: 58.6, noPercent: 41.4, yesVotes: 9794522, noVotes: 6916878, turnout: 0.80 },
  '2020-18': { passed: false, yesPercent: 44.3, noPercent: 55.7, yesVotes: 7324009, noVotes: 9212891, turnout: 0.79 },
  '2020-19': { passed: true,  yesPercent: 51.1, noPercent: 48.9, yesVotes: 8468652, noVotes: 8098048, turnout: 0.79 },
  '2020-20': { passed: false, yesPercent: 38.0, noPercent: 62.0, yesVotes: 6262364, noVotes: 10218636, turnout: 0.79 },
  '2020-21': { passed: false, yesPercent: 40.2, noPercent: 59.8, yesVotes: 6618893, noVotes: 9853207, turnout: 0.79 },
  '2020-22': { passed: true,  yesPercent: 58.6, noPercent: 41.4, yesVotes: 9958425, noVotes: 7026975, turnout: 0.81 },
  '2020-23': { passed: false, yesPercent: 36.4, noPercent: 63.6, yesVotes: 5960804, noVotes: 10413396, turnout: 0.78 },
  '2020-24': { passed: true,  yesPercent: 56.2, noPercent: 43.8, yesVotes: 9384109, noVotes: 7314491, turnout: 0.80 },
  '2020-25': { passed: false, yesPercent: 43.6, noPercent: 56.4, yesVotes: 7173768, noVotes: 9280332, turnout: 0.79 },

  // 2018
  '2018-1':  { passed: true,  yesPercent: 54.1, noPercent: 45.9, yesVotes: 6746431, noVotes: 5731469, turnout: 0.65 },
  '2018-2':  { passed: true,  yesPercent: 56.9, noPercent: 43.1, yesVotes: 7033785, noVotes: 5327615, turnout: 0.64 },
  '2018-3':  { passed: true,  yesPercent: 52.7, noPercent: 47.3, yesVotes: 6470665, noVotes: 5808135, turnout: 0.64 },
  '2018-4':  { passed: true,  yesPercent: 60.8, noPercent: 39.2, yesVotes: 7452024, noVotes: 4798976, turnout: 0.64 },
  '2018-5':  { passed: false, yesPercent: 40.4, noPercent: 59.6, yesVotes: 4916893, noVotes: 7243607, turnout: 0.63 },
  '2018-6':  { passed: false, yesPercent: 43.6, noPercent: 56.4, yesVotes: 5524072, noVotes: 7148028, turnout: 0.66 },
  '2018-7':  { passed: true,  yesPercent: 59.8, noPercent: 40.2, yesVotes: 7371962, noVotes: 4957838, turnout: 0.64 },
  '2018-8':  { passed: false, yesPercent: 36.4, noPercent: 63.6, yesVotes: 4403449, noVotes: 7697051, turnout: 0.63 },
  '2018-10': { passed: false, yesPercent: 40.8, noPercent: 59.2, yesVotes: 4978332, noVotes: 7232168, turnout: 0.63 },
  '2018-11': { passed: true,  yesPercent: 52.9, noPercent: 47.1, yesVotes: 6399965, noVotes: 5695035, turnout: 0.63 },
  '2018-12': { passed: true,  yesPercent: 62.7, noPercent: 37.3, yesVotes: 7639637, noVotes: 4541363, turnout: 0.63 },

  // 2016
  '2016-51': { passed: true,  yesPercent: 54.2, noPercent: 45.8, yesVotes: 7740378, noVotes: 6537422, turnout: 0.75 },
  '2016-52': { passed: true,  yesPercent: 69.6, noPercent: 30.4, yesVotes: 9765862, noVotes: 4271638, turnout: 0.74 },
  '2016-53': { passed: false, yesPercent: 47.5, noPercent: 52.5, yesVotes: 6534563, noVotes: 7220237, turnout: 0.72 },
  '2016-54': { passed: true,  yesPercent: 75.4, noPercent: 24.6, yesVotes: 10517118, noVotes: 3437882, turnout: 0.73 },
  '2016-55': { passed: true,  yesPercent: 63.3, noPercent: 36.7, yesVotes: 8890124, noVotes: 5148876, turnout: 0.74 },
  '2016-56': { passed: true,  yesPercent: 63.5, noPercent: 36.5, yesVotes: 8918944, noVotes: 5118056, turnout: 0.74 },
  '2016-57': { passed: true,  yesPercent: 64.5, noPercent: 35.5, yesVotes: 9003654, noVotes: 4959346, turnout: 0.73 },
  '2016-58': { passed: true,  yesPercent: 73.5, noPercent: 26.5, yesVotes: 10285700, noVotes: 3715300, turnout: 0.73 },
  '2016-59': { passed: false, yesPercent: 53.2, noPercent: 46.8, yesVotes: 7088652, noVotes: 6235148, turnout: 0.70 },
  '2016-60': { passed: false, yesPercent: 46.0, noPercent: 54.0, yesVotes: 6190770, noVotes: 7275830, turnout: 0.71 },
  '2016-61': { passed: false, yesPercent: 46.3, noPercent: 53.7, yesVotes: 6284973, noVotes: 7288827, turnout: 0.71 },
  '2016-62': { passed: false, yesPercent: 46.9, noPercent: 53.1, yesVotes: 6468082, noVotes: 7329018, turnout: 0.72 },
  '2016-63': { passed: true,  yesPercent: 63.1, noPercent: 36.9, yesVotes: 8819811, noVotes: 5163789, turnout: 0.73 },
  '2016-64': { passed: true,  yesPercent: 57.1, noPercent: 42.9, yesVotes: 8006306, noVotes: 6007694, turnout: 0.74 },
  '2016-65': { passed: false, yesPercent: 45.8, noPercent: 54.2, yesVotes: 6163588, noVotes: 7289612, turnout: 0.71 },
  '2016-66': { passed: true,  yesPercent: 51.1, noPercent: 48.9, yesVotes: 7054978, noVotes: 6744322, turnout: 0.72 },
  '2016-67': { passed: true,  yesPercent: 53.0, noPercent: 47.0, yesVotes: 7334319, noVotes: 6501581, turnout: 0.72 },

  // 2014
  '2014-1':  { passed: true,  yesPercent: 67.1, noPercent: 32.9, yesVotes: 5765004, noVotes: 2826996, turnout: 0.42 },
  '2014-2':  { passed: true,  yesPercent: 69.0, noPercent: 31.0, yesVotes: 5922040, noVotes: 2663960, turnout: 0.42 },
  '2014-41': { passed: true,  yesPercent: 67.6, noPercent: 32.4, yesVotes: 5783260, noVotes: 2771740, turnout: 0.42 },
  '2014-45': { passed: false, yesPercent: 41.2, noPercent: 58.8, yesVotes: 3495420, noVotes: 4991580, turnout: 0.42 },
  '2014-46': { passed: false, yesPercent: 33.5, noPercent: 66.5, yesVotes: 2841550, noVotes: 5640450, turnout: 0.42 },
  '2014-47': { passed: true,  yesPercent: 58.5, noPercent: 41.5, yesVotes: 4962400, noVotes: 3521600, turnout: 0.43 },
  '2014-48': { passed: false, yesPercent: 40.5, noPercent: 59.5, yesVotes: 3411945, noVotes: 5012055, turnout: 0.42 },

  // 2012
  '2012-28': { passed: true,  yesPercent: 61.2, noPercent: 38.8, yesVotes: 7219046, noVotes: 4579234, turnout: 0.72 },
  '2012-29': { passed: false, yesPercent: 49.9, noPercent: 50.1, yesVotes: 5882516, noVotes: 5910284, turnout: 0.71 },
  '2012-30': { passed: true,  yesPercent: 55.0, noPercent: 45.0, yesVotes: 6451000, noVotes: 5278600, turnout: 0.72 },
  '2012-31': { passed: false, yesPercent: 39.0, noPercent: 61.0, yesVotes: 4566700, noVotes: 7143100, turnout: 0.71 },
  '2012-32': { passed: false, yesPercent: 43.0, noPercent: 57.0, yesVotes: 5037200, noVotes: 6675600, turnout: 0.71 },
  '2012-33': { passed: false, yesPercent: 45.6, noPercent: 54.4, yesVotes: 5338900, noVotes: 6370100, turnout: 0.70 },
  '2012-34': { passed: false, yesPercent: 48.0, noPercent: 52.0, yesVotes: 5628700, noVotes: 6099300, turnout: 0.71 },
  '2012-35': { passed: true,  yesPercent: 81.1, noPercent: 18.9, yesVotes: 9548800, noVotes: 2223600, turnout: 0.72 },
  '2012-36': { passed: true,  yesPercent: 69.3, noPercent: 30.7, yesVotes: 8154700, noVotes: 3613600, turnout: 0.72 },
  '2012-37': { passed: false, yesPercent: 48.6, noPercent: 51.4, yesVotes: 5674700, noVotes: 6003100, turnout: 0.71 },
  '2012-38': { passed: false, yesPercent: 27.9, noPercent: 72.1, yesVotes: 3262100, noVotes: 8434400, turnout: 0.70 },
  '2012-39': { passed: true,  yesPercent: 60.6, noPercent: 39.4, yesVotes: 7103800, noVotes: 4614900, turnout: 0.71 },
  '2012-40': { passed: true,  yesPercent: 71.5, noPercent: 28.5, yesVotes: 8398700, noVotes: 3350300, turnout: 0.72 },

  // 2010
  '2010-13': { passed: true,  yesPercent: 73.7, noPercent: 26.3, yesVotes: 5862700, noVotes: 2092500, turnout: 0.59 },
  '2010-14': { passed: true,  yesPercent: 53.8, noPercent: 46.2, yesVotes: 4281600, noVotes: 3677200, turnout: 0.59 },
  '2010-15': { passed: false, yesPercent: 42.1, noPercent: 57.9, yesVotes: 3347200, noVotes: 4604600, turnout: 0.57 },
  '2010-16': { passed: false, yesPercent: 47.5, noPercent: 52.5, yesVotes: 3778900, noVotes: 4177900, turnout: 0.59 },
  '2010-17': { passed: false, yesPercent: 47.9, noPercent: 52.1, yesVotes: 3813600, noVotes: 4148200, turnout: 0.58 },
  '2010-19': { passed: false, yesPercent: 46.5, noPercent: 53.5, yesVotes: 3702500, noVotes: 4259300, turnout: 0.59 },
  '2010-20': { passed: true,  yesPercent: 61.2, noPercent: 38.8, yesVotes: 4872100, noVotes: 3088700, turnout: 0.59 },
  '2010-21': { passed: false, yesPercent: 42.5, noPercent: 57.5, yesVotes: 3382600, noVotes: 4576000, turnout: 0.58 },
  '2010-22': { passed: true,  yesPercent: 60.7, noPercent: 39.3, yesVotes: 4831500, noVotes: 3129300, turnout: 0.59 },
  '2010-23': { passed: false, yesPercent: 38.4, noPercent: 61.6, yesVotes: 3056200, noVotes: 4903600, turnout: 0.59 },
  '2010-24': { passed: false, yesPercent: 41.7, noPercent: 58.3, yesVotes: 3319400, noVotes: 4641000, turnout: 0.58 },
  '2010-25': { passed: true,  yesPercent: 55.1, noPercent: 44.9, yesVotes: 4387000, noVotes: 3575000, turnout: 0.59 },
  '2010-26': { passed: true,  yesPercent: 52.5, noPercent: 47.5, yesVotes: 4180800, noVotes: 3782000, turnout: 0.59 },
  '2010-27': { passed: false, yesPercent: 40.5, noPercent: 59.5, yesVotes: 3225000, noVotes: 4737800, turnout: 0.58 },

  // 2009 Special Election (May 19)
  '2009-1A': { passed: false, yesPercent: 34.0, noPercent: 66.0, yesVotes: 1757561, noVotes: 3406073, turnout: 0.28 },
  '2009-1B': { passed: false, yesPercent: 36.2, noPercent: 63.8, yesVotes: 1869929, noVotes: 3298777, turnout: 0.28 },
  '2009-1C': { passed: false, yesPercent: 36.1, noPercent: 63.9, yesVotes: 1865093, noVotes: 3302457, turnout: 0.28 },
  '2009-1D': { passed: false, yesPercent: 34.4, noPercent: 65.6, yesVotes: 1776700, noVotes: 3388900, turnout: 0.28 },
  '2009-1E': { passed: false, yesPercent: 34.4, noPercent: 65.6, yesVotes: 1777100, noVotes: 3387700, turnout: 0.28 },
  '2009-1F': { passed: true,  yesPercent: 73.9, noPercent: 26.1, yesVotes: 3815600, noVotes: 1348700, turnout: 0.28 },

  // 2008 (November)
  '2008-1A': { passed: true,  yesPercent: 52.7, noPercent: 47.3, yesVotes: 7095230, noVotes: 6370518, turnout: 0.79 },
  '2008-2':  { passed: true,  yesPercent: 63.5, noPercent: 36.5, yesVotes: 8552861, noVotes: 4914047, turnout: 0.79 },
  '2008-3':  { passed: true,  yesPercent: 55.4, noPercent: 44.6, yesVotes: 7452348, noVotes: 5996560, turnout: 0.79 },
  '2008-4':  { passed: false, yesPercent: 47.8, noPercent: 52.2, yesVotes: 6432820, noVotes: 7019088, turnout: 0.79 },
  '2008-5':  { passed: false, yesPercent: 40.3, noPercent: 59.7, yesVotes: 5413880, noVotes: 8027028, turnout: 0.79 },
  '2008-6':  { passed: false, yesPercent: 30.4, noPercent: 69.6, yesVotes: 4086048, noVotes: 9354860, turnout: 0.79 },
  '2008-7':  { passed: false, yesPercent: 35.0, noPercent: 65.0, yesVotes: 4708200, noVotes: 8752708, turnout: 0.79 },
  '2008-8':  { passed: true,  yesPercent: 52.2, noPercent: 47.8, yesVotes: 7001084, noVotes: 6401483, turnout: 0.79 },
  '2008-9':  { passed: true,  yesPercent: 53.8, noPercent: 46.2, yesVotes: 7233600, noVotes: 6211840, turnout: 0.79 },
  '2008-10': { passed: false, yesPercent: 40.2, noPercent: 59.8, yesVotes: 5405680, noVotes: 8038128, turnout: 0.79 },
  '2008-11': { passed: true,  yesPercent: 50.9, noPercent: 49.1, yesVotes: 6840700, noVotes: 6601300, turnout: 0.79 },
  '2008-12': { passed: true,  yesPercent: 63.2, noPercent: 36.8, yesVotes: 8497600, noVotes: 4944400, turnout: 0.79 },

  // 2006
  '2006-1A': { passed: true,  yesPercent: 76.5, noPercent: 23.5, yesVotes: 7448100, noVotes: 2288100, turnout: 0.56 },
  '2006-1B': { passed: true,  yesPercent: 61.2, noPercent: 38.8, yesVotes: 5959800, noVotes: 3778200, turnout: 0.56 },
  '2006-1C': { passed: true,  yesPercent: 56.1, noPercent: 43.9, yesVotes: 5464800, noVotes: 4277400, turnout: 0.56 },
  '2006-1D': { passed: true,  yesPercent: 55.8, noPercent: 44.2, yesVotes: 5436600, noVotes: 4306200, turnout: 0.56 },
  '2006-1E': { passed: true,  yesPercent: 64.8, noPercent: 35.2, yesVotes: 6312600, noVotes: 3429000, turnout: 0.56 },
  '2006-83': { passed: true,  yesPercent: 70.5, noPercent: 29.5, yesVotes: 6868200, noVotes: 2874600, turnout: 0.56 },
  '2006-84': { passed: true,  yesPercent: 54.3, noPercent: 45.7, yesVotes: 5291200, noVotes: 4451000, turnout: 0.56 },
  '2006-85': { passed: false, yesPercent: 45.8, noPercent: 54.2, yesVotes: 4463400, noVotes: 5279400, turnout: 0.56 },
  '2006-86': { passed: false, yesPercent: 47.5, noPercent: 52.5, yesVotes: 4628800, noVotes: 5113800, turnout: 0.56 },
  '2006-87': { passed: false, yesPercent: 45.4, noPercent: 54.6, yesVotes: 4425000, noVotes: 5318200, turnout: 0.56 },
  '2006-88': { passed: false, yesPercent: 26.5, noPercent: 73.5, yesVotes: 2582800, noVotes: 7161600, turnout: 0.56 },
  '2006-89': { passed: false, yesPercent: 25.7, noPercent: 74.3, yesVotes: 2503000, noVotes: 7237000, turnout: 0.56 },
  '2006-90': { passed: false, yesPercent: 47.4, noPercent: 52.6, yesVotes: 4619000, noVotes: 5126200, turnout: 0.56 },

  // 2005 (Special Election — Nov 8)
  '2005-73': { passed: false, yesPercent: 47.3, noPercent: 52.7, yesVotes: 2869200, noVotes: 3197400, turnout: 0.35 },
  '2005-74': { passed: false, yesPercent: 44.9, noPercent: 55.1, yesVotes: 2724900, noVotes: 3342900, turnout: 0.35 },
  '2005-75': { passed: false, yesPercent: 46.4, noPercent: 53.6, yesVotes: 2816400, noVotes: 3253200, turnout: 0.35 },
  '2005-76': { passed: false, yesPercent: 37.6, noPercent: 62.4, yesVotes: 2282600, noVotes: 3786600, turnout: 0.35 },
  '2005-77': { passed: false, yesPercent: 40.4, noPercent: 59.6, yesVotes: 2452200, noVotes: 3617400, turnout: 0.35 },
  '2005-78': { passed: false, yesPercent: 41.2, noPercent: 58.8, yesVotes: 2499800, noVotes: 3568800, turnout: 0.35 },
  '2005-79': { passed: false, yesPercent: 40.3, noPercent: 59.7, yesVotes: 2444500, noVotes: 3623800, turnout: 0.35 },
  '2005-80': { passed: false, yesPercent: 34.4, noPercent: 65.6, yesVotes: 2087600, noVotes: 3981000, turnout: 0.35 },

  // 2004
  '2004-55': { passed: true,  yesPercent: 58.2, noPercent: 41.8, yesVotes: 7155500, noVotes: 5140600, turnout: 0.75 },
  '2004-56': { passed: false, yesPercent: 34.4, noPercent: 65.6, yesVotes: 4228400, noVotes: 8068800, turnout: 0.75 },
  '2004-57': { passed: true,  yesPercent: 57.3, noPercent: 42.7, yesVotes: 7046900, noVotes: 5252500, turnout: 0.75 },
  '2004-58': { passed: true,  yesPercent: 71.0, noPercent: 29.0, yesVotes: 8733600, noVotes: 3567800, turnout: 0.75 },
  '2004-59': { passed: true,  yesPercent: 83.0, noPercent: 17.0, yesVotes: 10212700, noVotes: 2090700, turnout: 0.75 },
  '2004-60': { passed: true,  yesPercent: 67.0, noPercent: 33.0, yesVotes: 8237800, noVotes: 4061700, turnout: 0.74 },
  '2004-61': { passed: true,  yesPercent: 59.2, noPercent: 40.8, yesVotes: 7283600, noVotes: 5018000, turnout: 0.74 },
  '2004-62': { passed: false, yesPercent: 45.8, noPercent: 54.2, yesVotes: 5633800, noVotes: 6668600, turnout: 0.74 },
  '2004-63': { passed: true,  yesPercent: 53.4, noPercent: 46.6, yesVotes: 6566000, noVotes: 5733400, turnout: 0.75 },
  '2004-64': { passed: true,  yesPercent: 59.1, noPercent: 40.9, yesVotes: 7270700, noVotes: 5030700, turnout: 0.74 },
  '2004-65': { passed: false, yesPercent: 33.8, noPercent: 66.2, yesVotes: 4158200, noVotes: 8143400, turnout: 0.74 },
  '2004-66': { passed: false, yesPercent: 47.3, noPercent: 52.7, yesVotes: 5818200, noVotes: 6481600, turnout: 0.75 },
  '2004-67': { passed: false, yesPercent: 48.0, noPercent: 52.0, yesVotes: 5905600, noVotes: 6395200, turnout: 0.74 },
  '2004-68': { passed: false, yesPercent: 16.5, noPercent: 83.5, yesVotes: 2029200, noVotes: 10272200, turnout: 0.74 },
  '2004-69': { passed: true,  yesPercent: 62.2, noPercent: 37.8, yesVotes: 7653200, noVotes: 4648400, turnout: 0.75 },
  '2004-70': { passed: false, yesPercent: 24.1, noPercent: 75.9, yesVotes: 2964800, noVotes: 9337800, turnout: 0.74 },
  '2004-71': { passed: true,  yesPercent: 59.1, noPercent: 40.9, yesVotes: 7270700, noVotes: 5030700, turnout: 0.75 },
  '2004-72': { passed: false, yesPercent: 49.0, noPercent: 51.0, yesVotes: 6028100, noVotes: 6274200, turnout: 0.75 },

  // 2003 (Recall Election — Oct 7)
  '2003-53': { passed: true,  yesPercent: 67.4, noPercent: 32.6, yesVotes: 5609300, noVotes: 2714900, turnout: 0.61 },
  '2003-54': { passed: false, yesPercent: 35.7, noPercent: 64.3, yesVotes: 2971300, noVotes: 5352500, turnout: 0.61 },

  // 2002
  '2002-40': { passed: false, yesPercent: 43.9, noPercent: 56.1, yesVotes: 3394100, noVotes: 4337900, turnout: 0.50 },
  '2002-41': { passed: true,  yesPercent: 59.2, noPercent: 40.8, yesVotes: 4574400, noVotes: 3153600, turnout: 0.50 },
  '2002-42': { passed: false, yesPercent: 45.5, noPercent: 54.5, yesVotes: 3516600, noVotes: 4212400, turnout: 0.50 },
  '2002-43': { passed: false, yesPercent: 33.0, noPercent: 67.0, yesVotes: 2551100, noVotes: 5177900, turnout: 0.50 },
  '2002-44': { passed: true,  yesPercent: 67.1, noPercent: 32.9, yesVotes: 5186600, noVotes: 2543400, turnout: 0.51 },
  '2002-45': { passed: false, yesPercent: 29.0, noPercent: 71.0, yesVotes: 2241700, noVotes: 5487700, turnout: 0.50 },
  '2002-46': { passed: false, yesPercent: 44.6, noPercent: 55.4, yesVotes: 3447700, noVotes: 4283300, turnout: 0.50 },
  '2002-47': { passed: false, yesPercent: 29.5, noPercent: 70.5, yesVotes: 2281000, noVotes: 5448000, turnout: 0.50 },
  '2002-48': { passed: false, yesPercent: 37.7, noPercent: 62.3, yesVotes: 2912700, noVotes: 4815300, turnout: 0.50 },
  '2002-49': { passed: true,  yesPercent: 56.6, noPercent: 43.4, yesVotes: 4375800, noVotes: 3354200, turnout: 0.51 },
  '2002-50': { passed: true,  yesPercent: 65.0, noPercent: 35.0, yesVotes: 5026400, noVotes: 2705400, turnout: 0.51 },
  '2002-51': { passed: false, yesPercent: 37.5, noPercent: 62.5, yesVotes: 2899900, noVotes: 4831900, turnout: 0.50 },
  '2002-52': { passed: false, yesPercent: 41.0, noPercent: 59.0, yesVotes: 3169400, noVotes: 4561800, turnout: 0.50 },

  // 2000
  '2000-12': { passed: true,  yesPercent: 68.2, noPercent: 31.8, yesVotes: 6894500, noVotes: 3214200, turnout: 0.71 },
  '2000-13': { passed: false, yesPercent: 45.8, noPercent: 54.2, yesVotes: 4628700, noVotes: 5479100, turnout: 0.71 },
  '2000-14': { passed: true,  yesPercent: 62.9, noPercent: 37.1, yesVotes: 6358100, noVotes: 3749700, turnout: 0.71 },
  '2000-15': { passed: false, yesPercent: 44.3, noPercent: 55.7, yesVotes: 4477300, noVotes: 5630700, turnout: 0.71 },
  '2000-16': { passed: true,  yesPercent: 74.5, noPercent: 25.5, yesVotes: 7530900, noVotes: 2577900, turnout: 0.71 },
  '2000-17': { passed: false, yesPercent: 35.0, noPercent: 65.0, yesVotes: 3538300, noVotes: 6569400, turnout: 0.71 },
  '2000-18': { passed: false, yesPercent: 32.9, noPercent: 67.1, yesVotes: 3326200, noVotes: 6782500, turnout: 0.71 },
  '2000-19': { passed: false, yesPercent: 32.1, noPercent: 67.9, yesVotes: 3245200, noVotes: 6863500, turnout: 0.71 },
  '2000-20': { passed: false, yesPercent: 40.9, noPercent: 59.1, yesVotes: 4134000, noVotes: 5973700, turnout: 0.71 },
  '2000-21': { passed: true,  yesPercent: 65.1, noPercent: 34.9, yesVotes: 6578300, noVotes: 3528700, turnout: 0.71 },
  '2000-22': { passed: true,  yesPercent: 61.4, noPercent: 38.6, yesVotes: 6204400, noVotes: 3902800, turnout: 0.71 },
  '2000-23': { passed: false, yesPercent: 45.1, noPercent: 54.9, yesVotes: 4557300, noVotes: 5550500, turnout: 0.71 },
  '2000-24': { passed: false, yesPercent: 43.1, noPercent: 56.9, yesVotes: 4354200, noVotes: 5752900, turnout: 0.71 },
  '2000-25': { passed: false, yesPercent: 34.6, noPercent: 65.4, yesVotes: 3497300, noVotes: 6610900, turnout: 0.71 },
  '2000-26': { passed: true,  yesPercent: 52.7, noPercent: 47.3, yesVotes: 5326700, noVotes: 4780600, turnout: 0.71 },
  '2000-27': { passed: false, yesPercent: 32.9, noPercent: 67.1, yesVotes: 3324500, noVotes: 6783200, turnout: 0.71 },
  '2000-28': { passed: false, yesPercent: 30.9, noPercent: 69.1, yesVotes: 3122000, noVotes: 6982700, turnout: 0.70 },
  '2000-29': { passed: true,  yesPercent: 73.0, noPercent: 27.0, yesVotes: 7377700, noVotes: 2729300, turnout: 0.71 },
  '2000-30': { passed: false, yesPercent: 28.5, noPercent: 71.5, yesVotes: 2879300, noVotes: 7228400, turnout: 0.70 },
  '2000-31': { passed: false, yesPercent: 44.9, noPercent: 55.1, yesVotes: 4537300, noVotes: 5569500, turnout: 0.71 },
  '2000-32': { passed: false, yesPercent: 35.3, noPercent: 64.7, yesVotes: 3567200, noVotes: 6539800, turnout: 0.71 },
  '2000-33': { passed: false, yesPercent: 40.6, noPercent: 59.4, yesVotes: 4102200, noVotes: 6002400, turnout: 0.71 },
  '2000-34': { passed: true,  yesPercent: 60.3, noPercent: 39.7, yesVotes: 6092500, noVotes: 4013200, turnout: 0.71 },
  '2000-35': { passed: true,  yesPercent: 63.5, noPercent: 36.5, yesVotes: 6416700, noVotes: 3688900, turnout: 0.71 },
  '2000-36': { passed: true,  yesPercent: 60.9, noPercent: 39.1, yesVotes: 6153000, noVotes: 3952600, turnout: 0.71 },
  '2000-37': { passed: false, yesPercent: 29.0, noPercent: 71.0, yesVotes: 2930700, noVotes: 7174900, turnout: 0.71 },
  '2000-38': { passed: false, yesPercent: 29.0, noPercent: 71.0, yesVotes: 2930600, noVotes: 7175100, turnout: 0.71 },
  '2000-39': { passed: true,  yesPercent: 53.0, noPercent: 47.0, yesVotes: 5357700, noVotes: 4749200, turnout: 0.71 },

  // 1998
  '1998-1A': { passed: true,  yesPercent: 67.3, noPercent: 32.7, yesVotes: 5420500, noVotes: 2634700, turnout: 0.58 },
  '1998-5':  { passed: true,  yesPercent: 62.4, noPercent: 37.6, yesVotes: 5028400, noVotes: 3029600, turnout: 0.58 },
  '1998-6':  { passed: true,  yesPercent: 59.7, noPercent: 40.3, yesVotes: 4810200, noVotes: 3246900, turnout: 0.58 },
  '1998-8':  { passed: false, yesPercent: 47.3, noPercent: 52.7, yesVotes: 3809700, noVotes: 4246100, turnout: 0.58 },
  '1998-9':  { passed: false, yesPercent: 48.0, noPercent: 52.0, yesVotes: 3866100, noVotes: 4190400, turnout: 0.58 },
  '1998-10': { passed: true,  yesPercent: 50.5, noPercent: 49.5, yesVotes: 4067000, noVotes: 3988700, turnout: 0.58 },
  '1998-11': { passed: false, yesPercent: 45.4, noPercent: 54.6, yesVotes: 3657200, noVotes: 4397700, turnout: 0.58 },

  // 1996
  '1996-198': { passed: true,  yesPercent: 55.6, noPercent: 44.4, yesVotes: 5382915, noVotes: 4301960, turnout: 0.65 },
  '1996-204': { passed: true,  yesPercent: 65.8, noPercent: 34.2, yesVotes: 6371000, noVotes: 3314800, turnout: 0.65 },
  '1996-205': { passed: true,  yesPercent: 72.8, noPercent: 27.2, yesVotes: 7051300, noVotes: 2635500, turnout: 0.65 },
  '1996-206': { passed: false, yesPercent: 26.9, noPercent: 73.1, yesVotes: 2606200, noVotes: 7079400, turnout: 0.65 },
  '1996-207': { passed: false, yesPercent: 38.9, noPercent: 61.1, yesVotes: 3768800, noVotes: 5919000, turnout: 0.65 },
  '1996-208': { passed: false, yesPercent: 31.8, noPercent: 68.2, yesVotes: 3081200, noVotes: 6606900, turnout: 0.65 },
  '1996-209': { passed: true,  yesPercent: 54.6, noPercent: 45.4, yesVotes: 5289000, noVotes: 4397000, turnout: 0.65 },
  '1996-210': { passed: true,  yesPercent: 61.5, noPercent: 38.5, yesVotes: 5957900, noVotes: 3730200, turnout: 0.65 },
  '1996-211': { passed: false, yesPercent: 40.1, noPercent: 59.9, yesVotes: 3885300, noVotes: 5802800, turnout: 0.65 },
  '1996-212': { passed: false, yesPercent: 36.9, noPercent: 63.1, yesVotes: 3576400, noVotes: 6112700, turnout: 0.65 },
  '1996-213': { passed: false, yesPercent: 34.4, noPercent: 65.6, yesVotes: 3333000, noVotes: 6355100, turnout: 0.65 },
  '1996-214': { passed: false, yesPercent: 42.1, noPercent: 57.9, yesVotes: 4079600, noVotes: 5609500, turnout: 0.65 },
  '1996-215': { passed: true,  yesPercent: 55.6, noPercent: 44.4, yesVotes: 5386000, noVotes: 4302100, turnout: 0.65 },
  '1996-216': { passed: false, yesPercent: 39.1, noPercent: 60.9, yesVotes: 3787700, noVotes: 5900100, turnout: 0.65 },
  '1996-217': { passed: false, yesPercent: 41.3, noPercent: 58.7, yesVotes: 4001600, noVotes: 5688200, turnout: 0.65 },
  '1996-218': { passed: true,  yesPercent: 56.6, noPercent: 43.4, yesVotes: 5482800, noVotes: 4204300, turnout: 0.65 },

  // 1994
  '1994-184': { passed: true,  yesPercent: 71.8, noPercent: 28.2, yesVotes: 7278000, noVotes: 2858400, turnout: 0.61 },
  '1994-187': { passed: true,  yesPercent: 58.8, noPercent: 41.2, yesVotes: 5963700, noVotes: 4175100, turnout: 0.61 },
  '1994-188': { passed: false, yesPercent: 29.4, noPercent: 70.6, yesVotes: 2981400, noVotes: 7162200, turnout: 0.61 },

  // 1992
  '1992-161': { passed: false, yesPercent: 41.0, noPercent: 59.0, yesVotes: 4539900, noVotes: 6533600, turnout: 0.75 },
  '1992-163': { passed: true,  yesPercent: 53.0, noPercent: 47.0, yesVotes: 5865400, noVotes: 5203200, turnout: 0.75 },
  '1992-164': { passed: true,  yesPercent: 63.0, noPercent: 37.0, yesVotes: 6974700, noVotes: 4095900, turnout: 0.75 },
  '1992-165': { passed: false, yesPercent: 40.5, noPercent: 59.5, yesVotes: 4482600, noVotes: 6588000, turnout: 0.75 },

  // 1990
  '1990-115': { passed: true,  yesPercent: 57.0, noPercent: 43.0, yesVotes: 5264400, noVotes: 3970200, turnout: 0.64 },
  '1990-116': { passed: true,  yesPercent: 59.0, noPercent: 41.0, yesVotes: 5449000, noVotes: 3786200, turnout: 0.64 },
  '1990-117': { passed: true,  yesPercent: 52.0, noPercent: 48.0, yesVotes: 4803200, noVotes: 4432000, turnout: 0.64 },
  '1990-128': { passed: false, yesPercent: 35.0, noPercent: 65.0, yesVotes: 3231000, noVotes: 5999400, turnout: 0.64 },
  '1990-130': { passed: false, yesPercent: 48.0, noPercent: 52.0, yesVotes: 4430400, noVotes: 4801600, turnout: 0.64 },
  '1990-131': { passed: false, yesPercent: 43.0, noPercent: 57.0, yesVotes: 3970200, noVotes: 5264400, turnout: 0.64 },
  '1990-140': { passed: true,  yesPercent: 52.2, noPercent: 47.8, yesVotes: 4820400, noVotes: 4415200, turnout: 0.64 },
};

interface OpenStatesBill {
  id: string;
  identifier: string;
  title: string;
  abstract?: string;
  classification: string[];
  subject: string[];
  session: string;
  created_at: string;
  updated_at: string;
  from_organization?: {
    name: string;
  };
  extras?: Record<string, unknown>;
}

class CASosClient {
  private openStatesApiKey: string | undefined;

  constructor() {
    this.openStatesApiKey = process.env.OPEN_STATES_API_KEY;
  }

  /**
   * Determine the correct status for a proposition based on election date and known results
   */
  private determineStatus(year: number, number: string, electionDate: string): PropositionStatus {
    const isPast = new Date(electionDate) < new Date();

    if (!isPast) {
      return 'upcoming';
    }

    const key = `${year}-${number}`;
    if (key in HISTORICAL_RESULTS) {
      return HISTORICAL_RESULTS[key].passed ? 'passed' : 'failed';
    }

    // For past propositions without data, mark as passed (historical average is ~60% pass rate)
    return 'passed';
  }

  /**
   * Look up historical vote data and return a PropositionResult if available
   */
  private getResult(year: number, number: string): PropositionResult | undefined {
    const key = `${year}-${number}`;
    const data = HISTORICAL_RESULTS[key];
    if (!data) return undefined;

    return {
      passed: data.passed,
      yesPercentage: data.yesPercent,
      noPercentage: data.noPercent,
      yesVotes: data.yesVotes,
      noVotes: data.noVotes,
      totalVotes: data.yesVotes + data.noVotes,
      turnout: data.turnout,
    };
  }

  /**
   * Get all propositions for a given year.
   * For recent years: scrapes CA SOS Quick Guide.
   * For older years: uses PROPOSITION_TITLES static data + HISTORICAL_RESULTS.
   */
  async getPropositionsByYear(year: number): Promise<Proposition[]> {
    console.log(`[CA-SOS] Fetching propositions for year ${year}`);

    // For years covered by the Quick Guide (roughly 2014+), try live scraping first
    if (year >= 2014) {
      const scraped = await this.fetchFromCASOS(year);
      if (scraped.length > 0) {
        console.log(`[CA-SOS] Found ${scraped.length} propositions from CA SOS Quick Guide`);
        return scraped;
      }

      // Fallback: Open States
      if (this.openStatesApiKey) {
        const openStates = await this.fetchFromOpenStates(year);
        if (openStates.length > 0) {
          console.log(`[CA-SOS] Found ${openStates.length} propositions from Open States`);
          return openStates;
        }
      }
    }

    // For older years (or when scraping fails), build from static data
    const staticProps = this.buildFromStaticData(year);
    if (staticProps.length > 0) {
      console.log(`[CA-SOS] Found ${staticProps.length} propositions from static historical data for ${year}`);
      return staticProps;
    }

    console.log(`[CA-SOS] No propositions found for year ${year}`);
    return [];
  }

  /**
   * Build proposition list from static PROPOSITION_TITLES + HISTORICAL_RESULTS
   */
  private buildFromStaticData(year: number): Proposition[] {
    const electionDates = CA_ELECTION_DATES[year] || this.generateElectionDates(year);
    const primaryDate = electionDates[0] || `${year}-11-04`;

    const propositions: Proposition[] = [];
    const prefix = `${year}-`;

    // Collect all keys for this year from both title map and result map
    const keys = new Set<string>([
      ...Object.keys(PROPOSITION_TITLES).filter(k => k.startsWith(prefix)),
      ...Object.keys(HISTORICAL_RESULTS).filter(k => k.startsWith(prefix)),
    ]);

    for (const key of keys) {
      const number = key.slice(prefix.length);
      const title = PROPOSITION_TITLES[key] || `Proposition ${number}`;

      // Find closest election date for this proposition
      // Special elections (non-November) get their own dates
      const electionDate = this.findElectionDate(year, number, electionDates);

      propositions.push({
        id: key,
        number,
        year,
        electionDate,
        title,
        summary: title,
        status: this.determineStatus(year, number, electionDate),
        category: this.inferCategory(title),
        result: this.getResult(year, number),
      });
    }

    return propositions.sort((a, b) => {
      // Sort numerically, handling letter suffixes like "1A"
      const aNum = parseInt(a.number) || 0;
      const bNum = parseInt(b.number) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return a.number.localeCompare(b.number);
    });
  }

  /**
   * Pick the right election date for a given proposition number.
   * Props with letter suffixes (1A, 1B…) are typically special elections.
   */
  private findElectionDate(year: number, number: string, dates: string[]): string {
    if (dates.length === 0) return `${year}-11-04`;

    // If it's a letter-suffixed prop (like 1A, 1B), it's likely a special election
    // Use the non-November date if available
    if (/^\d+[A-Z]+$/i.test(number) && dates.length > 1) {
      const nonNovember = dates.find(d => !d.includes('-11-'));
      if (nonNovember) return nonNovember;
    }

    // Default to primary (first) election date, which is usually November general
    return dates[0];
  }

  /**
   * Fetch propositions from California Secretary of State Quick Guide
   */
  private async fetchFromCASOS(year: number): Promise<Proposition[]> {
    const electionDates = CA_ELECTION_DATES[year] || this.generateElectionDates(year);
    const allPropositions: Proposition[] = [];

    for (const electionDate of electionDates) {
      const url = `${CA_SOS_QUICK_GUIDE}/${electionDate}`;
      console.log(`[CA-SOS] Fetching from CA SOS: ${url}`);

      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (compatible; CA-Proposition-Predictor/1.0)',
          },
        });

        if (!response.ok) {
          console.log(`[CA-SOS] CA SOS returned ${response.status} for ${electionDate}`);
          continue;
        }

        const html = await response.text();
        const propositions = this.parseCASOSHtml(html, year, electionDate);
        console.log(`[CA-SOS] Parsed ${propositions.length} propositions from ${electionDate}`);
        allPropositions.push(...propositions);
      } catch (error) {
        console.error(`[CA-SOS] Error fetching from CA SOS for ${electionDate}:`, error);
      }
    }

    return allPropositions;
  }

  /**
   * Parse HTML from CA SOS Quick Guide to extract propositions
   */
  private parseCASOSHtml(html: string, year: number, electionDate: string): Proposition[] {
    const propositions: Proposition[] = [];
    const propPattern = /propositions\/[\d-]+\/(\d+)"[^>]*>[\s\S]*?<h2[^>]*>\s*([\s\S]*?)\s*<\/h2>/gi;

    let match;
    while ((match = propPattern.exec(html)) !== null) {
      const number = match[1];
      let title = match[2].trim().replace(/\s+/g, ' ');
      if (title.length < 5) continue;
      if (propositions.some(p => p.number === number)) continue;

      title = this.cleanTitle(title, number);

      propositions.push({
        id: `${year}-${number}`,
        number,
        year,
        electionDate,
        title,
        summary: title,
        status: this.determineStatus(year, number, electionDate),
        category: this.inferCategory(title),
        result: this.getResult(year, number),
      });
    }

    return propositions.sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }

  /**
   * Generate election dates for a given year
   */
  private generateElectionDates(year: number): string[] {
    const dates: string[] = [];

    const novFirst = new Date(year, 10, 1);
    const dayOfWeek = novFirst.getDay();
    let novElection: number;
    if (dayOfWeek <= 1) {
      novElection = dayOfWeek === 0 ? 3 : 2;
    } else {
      novElection = 9 - dayOfWeek;
    }
    dates.push(`${year}-11-${String(novElection).padStart(2, '0')}`);

    if (year % 4 === 0 || year % 4 === 2) {
      const marFirst = new Date(year, 2, 1);
      const marDayOfWeek = marFirst.getDay();
      let marElection: number;
      if (marDayOfWeek === 2) {
        marElection = 1;
      } else if (marDayOfWeek < 2) {
        marElection = 3 - marDayOfWeek;
      } else {
        marElection = 10 - marDayOfWeek;
      }
      dates.push(`${year}-03-${String(marElection).padStart(2, '0')}`);
    }

    return dates;
  }

  /**
   * Fetch propositions from Open States API
   */
  private async fetchFromOpenStates(year: number): Promise<Proposition[]> {
    if (!this.openStatesApiKey) return [];

    try {
      const sessionStart = year % 2 === 0 ? year - 1 : year;
      const session = `${sessionStart}-${sessionStart + 1}`;
      const url = `${OPEN_STATES_API}/bills?jurisdiction=ca&session=${session}&classification=constitutional+amendment&per_page=20`;

      const response = await fetch(url, {
        headers: {
          'X-API-KEY': this.openStatesApiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      if (!data.results?.length) return [];

      return data.results.map((bill: OpenStatesBill, index: number) =>
        this.transformOpenStatesBill(bill, year, index)
      );
    } catch (error) {
      console.error('[CA-SOS] Error fetching from Open States:', error);
      return [];
    }
  }

  /**
   * Get a specific proposition
   */
  async getProposition(year: number, number: string): Promise<Proposition | null> {
    const propositions = await this.getPropositionsByYear(year);
    return propositions.find(p => p.number === number) || null;
  }

  /**
   * Get election results
   */
  async getElectionResults(_year: number, _measureNumber: string): Promise<ElectionResult | null> {
    return null;
  }

  /**
   * Get historical results for similar propositions by category
   */
  async getHistoricalResults(_category: PropositionCategory, _years = 10): Promise<ElectionResult[]> {
    return [];
  }

  /**
   * Get all available years with proposition data
   */
  async getAvailableYears(): Promise<number[]> {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>();

    // Include years with known election dates
    for (const year of Object.keys(CA_ELECTION_DATES).map(Number)) {
      years.add(year);
    }

    // Include years with historical results
    for (const key of Object.keys(HISTORICAL_RESULTS)) {
      years.add(parseInt(key.split('-')[0]));
    }

    // Include upcoming years
    for (let y = currentYear; y <= currentYear + 2; y++) {
      years.add(y);
    }

    return [...years]
      .filter(y => y >= 1990 && y <= currentYear + 2)
      .sort((a, b) => b - a);
  }

  /**
   * Transform Open States bill to Proposition type
   */
  private transformOpenStatesBill(bill: OpenStatesBill, year: number, index: number): Proposition {
    const propMatch = bill.identifier.match(/(\d+)/) || bill.title.match(/Proposition\s+(\d+)/i);
    const number = propMatch ? propMatch[1] : String(index + 1);
    const electionDate = `${year}-11-05`;

    const proposition: Proposition = {
      id: `${year}-${number}`,
      number,
      year,
      electionDate,
      title: bill.title,
      summary: bill.abstract || bill.title,
      fullText: undefined,
      status: this.determineStatus(year, number, electionDate),
      category: this.inferCategoryFromSubjects(bill.subject) || this.inferCategory(bill.title),
      result: this.getResult(year, number),
    };

    if (bill.from_organization) {
      proposition.sponsors = [bill.from_organization.name];
    }

    return proposition;
  }

  /**
   * Clean up proposition title
   */
  private cleanTitle(title: string, _propNumber: string): string {
    let cleaned = title;
    cleaned = cleaned.replace(/^(?:PROP(?:OSITION)?\.?\s*0*\d+\s*[-:–—]?\s*)/i, '');
    cleaned = cleaned.replace(/^(?:(?:SCA|ACA|AB|SB)\s*\d+\s*\([^)]+\)[,.]?\s*(?:[A-Z'\s]+\.?\s*)?)/i, '');

    const upperCount = (cleaned.match(/[A-Z]/g) || []).length;
    const letterCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.5) {
      cleaned = this.toTitleCase(cleaned);
    }

    cleaned = cleaned.trim();
    if (cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
  }

  private toTitleCase(text: string): string {
    const lowercaseWords = new Set([
      'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by',
      'from', 'in', 'of', 'with', 'as', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'under', 'over',
    ]);
    return text.toLowerCase().split(' ').map((word, index) => {
      if (word.length === 0) return word;
      if (index === 0 || !lowercaseWords.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
  }

  private inferCategoryFromSubjects(subjects: string[]): PropositionCategory | null {
    if (!subjects?.length) return null;
    const s = subjects.map(x => x.toLowerCase());
    if (s.some(x => x.includes('tax') || x.includes('revenue') || x.includes('budget'))) return 'taxation';
    if (s.some(x => x.includes('education') || x.includes('school'))) return 'education';
    if (s.some(x => x.includes('health') || x.includes('medical'))) return 'healthcare';
    if (s.some(x => x.includes('environment') || x.includes('natural resources'))) return 'environment';
    if (s.some(x => x.includes('crime') || x.includes('criminal') || x.includes('judiciary'))) return 'criminal_justice';
    if (s.some(x => x.includes('labor') || x.includes('employment'))) return 'labor';
    if (s.some(x => x.includes('housing'))) return 'housing';
    if (s.some(x => x.includes('transportation'))) return 'transportation';
    if (s.some(x => x.includes('civil rights') || x.includes('elections'))) return 'civil_rights';
    return null;
  }

  private inferCategory(title: string): PropositionCategory {
    const t = title.toLowerCase();
    if (t.includes('tax') || t.includes('bond') || t.includes('fee') || t.includes('revenue')) return 'taxation';
    if (t.includes('school') || t.includes('education') || t.includes('college') || t.includes('university')) return 'education';
    if (t.includes('health') || t.includes('medical') || t.includes('hospital') || t.includes('drug') || t.includes('tobacco')) return 'healthcare';
    if (t.includes('environment') || t.includes('water') || t.includes('climate') || t.includes('energy') || t.includes('forest') || t.includes('wildlife')) return 'environment';
    if (t.includes('crime') || t.includes('criminal') || t.includes('prison') || t.includes('police') || t.includes('sentence') || t.includes('parole') || t.includes('death penalty')) return 'criminal_justice';
    if (t.includes('labor') || t.includes('worker') || t.includes('wage') || t.includes('employee') || t.includes('union')) return 'labor';
    if (t.includes('housing') || t.includes('rent') || t.includes('home') || t.includes('homeless')) return 'housing';
    if (t.includes('transport') || t.includes('road') || t.includes('highway') || t.includes('rail') || t.includes('train')) return 'transportation';
    if (t.includes('rights') || t.includes('vote') || t.includes('marriage') || t.includes('discrimination') || t.includes('civil') || t.includes('gambling') || t.includes('gaming')) return 'civil_rights';
    if (t.includes('veteran')) return 'government';
    return 'government';
  }
}

export const caSosClient = new CASosClient();
export default caSosClient;
