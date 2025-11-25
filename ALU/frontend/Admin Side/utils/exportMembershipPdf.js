import jsPDF from 'jspdf';

const DEFAULT_TEMPLATE_PATH = '/assets/membership-form-template.png';
const CANONICAL_TEMPLATE_SIZE = { width: 1414, height: 2000 };
const TEMPLATE_COORD_BASE = { width: 816, height: 1184 };

const EMBEDDED_TEMPLATE_SVG = `
<svg width="1414" height="2000" viewBox="0 0 816 1184" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <style>
      .label { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; fill: #000; }
      .header-text { font-family: Arial, sans-serif; font-weight: bold; fill: #00205B; }
      .sub-text { font-family: Arial, sans-serif; font-size: 10px; fill: #000; }
      .section-header { fill: #00aeef; }
      .section-title { font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; fill: #fff; letter-spacing: 2px; text-transform: uppercase; }
      .input-box { fill: none; stroke: #000; stroke-width: 0.7; }
      .checkbox { fill: none; stroke: #000; stroke-width: 0.7; }
      .tiny-text { font-family: Arial, sans-serif; font-size: 9px; fill: #000; }
      .title-main { font-size: 24px; font-weight: 800; fill: #00205B; }
      .title-sub { font-size: 14px; font-weight: bold; fill: #000; }
      .alu-text { font-family: Arial, sans-serif; font-weight: 900; fill: #CE1126; stroke: #fff; stroke-width: 0.5px; }
      .ring-text { font-family: Arial, sans-serif; font-weight: bold; font-size: 5px; fill: #CE1126; }
      .tri-text { font-family: Arial, sans-serif; font-weight: bold; font-size: 5.5px; fill: #fff; }
      .ribbon-text { font-family: Arial, sans-serif; font-weight: bold; font-size: 5px; fill: #CE1126; }
    </style>
    <symbol id="gear-tooth">
       <path d="M-1.5,-48 L-1.5,-52 L1.5,-52 L1.5,-48" fill="none" stroke="#00205B" stroke-width="2" />
       <circle cx="0" cy="-52" r="1.5" fill="#00205B" />
    </symbol>
  </defs>

  <rect width="100%" height="100%" fill="white"/>

  <g transform="translate(50, 30)">
    <circle cx="35" cy="35" r="30" fill="none" stroke="#0054a6" stroke-width="2"/>
    <text x="35" y="40" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="14" fill="#ce1126">ALU</text>
    <path d="M10,60 L60,60" stroke="#fdb913" stroke-width="3"/>
  </g>

  <text x="130" y="45" class="header-text" font-size="20">Associated Labor Unions</text>
  <text x="130" y="62" class="sub-text" font-size="11">Luzon Regional Office</text>
  <line x1="130" y1="70" x2="370" y2="68" stroke="#00205B" stroke-width="1.5" />
  <text x="130" y="82" class="sub-text">262 ALU-APSU-ITF Bldg. 15th Ave. Brgy. Silangan,</text>
  <text x="130" y="94" class="sub-text">Cubao, Quezon City</text>

  <text x="50" y="130" class="title-main">MEMBERSHIP</text>
  <text x="65" y="145" class="title-sub">REGISTRATION FORM</text>
  <rect x="50" y="135" width="10" height="10" fill="#00aeef" />

  <g transform="translate(628, 30)">
    <rect width="130" height="130" fill="none" stroke="#00aeef" stroke-width="3" />
    <text x="65" y="60" text-anchor="middle" font-family="Arial" font-size="12">2x2 picture</text>
    <text x="65" y="75" text-anchor="middle" font-family="Arial" font-size="12">here</text>
  </g>

  <rect x="50" y="160" width="710" height="35" class="section-header" />
  <rect x="50" y="160" width="15" height="35" fill="#255F9E" />
  <text x="80" y="185" class="section-title">PERSONAL INFORMATION</text>

  <text x="50" y="220" class="label">Full Name</text>
  <text x="160" y="220" class="label">:</text>
  <rect x="180" y="205" width="580" height="20" class="input-box" />

  <text x="50" y="255" class="label">Place of Birth</text>
  <text x="160" y="255" class="label">:</text>
  <rect x="180" y="240" width="240" height="20" class="input-box" />

  <text x="435" y="255" class="label">Date of Birth</text>
  <text x="550" y="255" class="label">:</text>
  <rect x="570" y="240" width="25" height="20" class="input-box" />
  <rect x="595" y="240" width="25" height="20" class="input-box" />
  <line x1="625" y1="250" x2="635" y2="250" stroke="black" stroke-width="2" />
  <rect x="640" y="240" width="25" height="20" class="input-box" />
  <rect x="665" y="240" width="25" height="20" class="input-box" />
  <line x1="695" y1="250" x2="705" y2="250" stroke="black" stroke-width="2" />
  <rect x="710" y="240" width="25" height="20" class="input-box" />
  <rect x="735" y="240" width="25" height="20" class="input-box" />

  <text x="50" y="290" class="label">Address</text>
  <text x="160" y="290" class="label">:</text>
  <rect x="180" y="275" width="580" height="20" class="input-box" />

  <text x="50" y="325" class="label">Status</text>
  <text x="160" y="325" class="label">:</text>
  <rect x="180" y="310" width="20" height="20" class="checkbox" />
  <text x="210" y="325" class="label">Single</text>
  <rect x="270" y="310" width="20" height="20" class="checkbox" />
  <text x="300" y="325" class="label">Married</text>
  <rect x="375" y="310" width="20" height="20" class="checkbox" />
  <text x="405" y="325" class="label">Divorce</text>
  <rect x="475" y="310" width="20" height="20" class="checkbox" />
  <text x="505" y="325" class="label">Others</text>
  <text x="595" y="325" class="label">Age  :</text>
  <rect x="665" y="310" width="95" height="20" class="input-box" />

  <text x="50" y="350" class="label">Educational</text>
  <text x="50" y="365" class="label">Attainment</text>
  <text x="160" y="360" class="label">:</text>
  <rect x="180" y="345" width="240" height="20" class="input-box" />

  <text x="435" y="360" class="label">No. of Children  :</text>
  <rect x="570" y="345" width="190" height="20" class="input-box" />

  <text x="50" y="395" class="label">Religion</text>
  <text x="160" y="395" class="label">:</text>
  <rect x="180" y="380" width="240" height="20" class="input-box" />

  <text x="435" y="395" class="label">Contact No.</text>
  <text x="550" y="395" class="label">:</text>
  <rect x="570" y="380" width="190" height="20" class="input-box" />

  <text x="50" y="430" class="label">E-Mail</text>
  <text x="160" y="430" class="label">:</text>
  <rect x="180" y="415" width="580" height="20" class="input-box" />

  <text x="50" y="465" class="label">Gender</text>
  <text x="160" y="465" class="label">:</text>
  <rect x="182" y="450" width="20" height="20" class="checkbox" />
  <text x="210" y="465" class="label">Man</text>
  <rect x="265" y="450" width="20" height="20" class="checkbox" />
  <text x="292" y="465" class="label">Woman</text>
  <rect x="372" y="450" width="20" height="20" class="checkbox" />
  <text x="402" y="450" class="label" font-size="12">Other (please state)</text>
  <line x1="402" y1="470" x2="528" y2="470" stroke="black" stroke-width="1.5" />
  <rect x="550" y="450" width="20" height="20" class="checkbox" />
  <text x="577" y="465" class="label">Prefer not to say</text>

  <rect x="50" y="490" width="710" height="35" class="section-header" />
  <rect x="50" y="490" width="15" height="35" fill="#255F9E" />
  <text x="80" y="515" class="section-title">EMPLOYMENT INFORMATION</text>

  <text x="50" y="550" class="label">Employer</text>
  <text x="160" y="550" class="label">:</text>
  <rect x="178" y="535" width="580" height="20" class="input-box" />

  <text x="50" y="585" class="label">Position</text>
  <text x="160" y="585" class="label">:</text>
  <rect x="178" y="570" width="580" height="20" class="input-box" />

  <text x="50" y="620" class="label">Unit/Section</text>
  <text x="160" y="620" class="label">:</text>
  <rect x="178" y="605" width="240" height="20" class="input-box" />

  <text x="450" y="620" class="label">Years Employed :</text>
  <rect x="585" y="605" width="172" height="20" class="input-box" />

  <text x="50" y="655" class="label">Name of Union</text>
  <text x="160" y="655" class="label">:</text>
  <rect x="178" y="640" width="580" height="20" class="input-box" />

  <text x="50" y="690" class="label">Position in Union</text>
  <rect x="178" y="675" width="170" height="20" class="input-box" />
  <text x="385" y="690" class="label">Date of Membership  :</text>
  <rect x="560" y="675" width="198" height="20" class="input-box" />

  <rect x="50" y="720" width="710" height="35" class="section-header" />
  <rect x="50" y="720" width="15" height="35" fill="#255F9E" />
  <text x="80" y="745" class="section-title">CONTACT PERSON IN CASE OF EMERGENCY:</text>

  <text x="50" y="780" class="label">Full Name</text>
  <text x="160" y="780" class="label">:</text>
  <rect x="178" y="765" width="580" height="20" class="input-box" />

  <text x="50" y="815" class="label">Address</text>
  <text x="160" y="815" class="label">:</text>
  <rect x="178" y="800" width="580" height="20" class="input-box" />

  <text x="50" y="850" class="label">Contact No.</text>
  <text x="160" y="850" class="label">:</text>
  <rect x="178" y="835" width="188" height="20" class="input-box" />

  <text x="430" y="850" class="label">Relationship</text>
  <text x="545" y="850" class="label">:</text>
  <rect x="568" y="835" width="188" height="20" class="input-box" />

  <g transform="translate(30, 890)">
    <text x="0" y="10" class="tiny-text" font-weight="bold">A note on Data Privacy and Confidentiality:</text>
    <text x="0" y="25" class="tiny-text">The Associated Labor Unions abides by the rules and regulations set by Republic Act No. 10173 or the</text>
    <text x="0" y="37" class="tiny-text">Data Privacy Act of 2012. All information provided in this form will be treated with utmost confidentiality.</text>
    <text x="0" y="65" class="tiny-text" font-weight="bold">Informed Consent:</text>
    <text x="0" y="80" class="tiny-text">The Associated Labor Unions may compile statistics on personal and sensitive personal information I</text>
    <text x="0" y="92" class="tiny-text">have willfully submitted and declared in connection with my union membership application subject to</text>
    <text x="0" y="104" class="tiny-text">the provisions of the Philippine Data Privacy Act. I understand that all information in my application and</text>
    <text x="0" y="116" class="tiny-text">request are necessary and will be treated with utmost confidentiality.</text>
    <line x1="540" y1="60" x2="725" y2="60" stroke="#00aeef" stroke-width="1" />
    <text x="600" y="80" class="label" font-weight="normal">Signature</text>
  </g>

  <rect x="0" y="1150" width="816" height="10" fill="#0054a6" />
  <rect x="0" y="1165" width="816" height="19" fill="#00aeef" />
</svg>
`;
const EMBEDDED_TEMPLATE_DATA_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(EMBEDDED_TEMPLATE_SVG)}`;

const normalize = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim();
  }
  return String(value).replace(/\s+/g, ' ').trim();
};

const formatDateText = (value) => {
  const normalized = normalize(value);
  if (!normalized) return '';
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const calculateAge = (value) => {
  const normalized = normalize(value);
  if (!normalized) return '';
  const dob = new Date(normalized);
  if (Number.isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday = today.getMonth() < dob.getMonth()
    || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age > 0 ? String(age) : '';
};

const relative = (x, y, width = 0) => ({
  x: x / TEMPLATE_COORD_BASE.width,
  y: y / TEMPLATE_COORD_BASE.height,
  width: width ? width / TEMPLATE_COORD_BASE.width : undefined,
});

const relativePoint = (x, y) => ({
  x: x / TEMPLATE_COORD_BASE.width,
  y: y / TEMPLATE_COORD_BASE.height,
});

const FIELD_COORDS = {
  fullName: relative(190, 212, 560),
  placeOfBirth: relative(190, 247, 220),
  dateOfBirth: relative(575, 247, 185),
  address: relative(190, 282, 560),
  statusOther: relative(520, 327, 140),
  age: relative(675, 317, 80),
  education: relative(190, 352, 220),
  children: relative(580, 352, 170),
  religion: relative(190, 387, 220),
  contactNumber: relative(580, 387, 170),
  email: relative(190, 422, 560),
  genderOther: relative(410, 458, 120),
  employer: relative(188, 542, 560),
  position: relative(188, 577, 560),
  unitSection: relative(188, 612, 220),
  yearsEmployed: relative(595, 612, 150),
  unionName: relative(188, 647, 560),
  unionPosition: relative(188, 682, 150),
  membershipDate: relative(570, 682, 180),
  emergencyName: relative(188, 772, 560),
  emergencyAddress: relative(188, 807, 560),
  emergencyContact: relative(188, 842, 168),
  emergencyRelationship: relative(578, 842, 168),
};

const STATUS_CHECKBOXES = {
  single: relativePoint(186, 314),
  married: relativePoint(276, 314),
  divorce: relativePoint(381, 314),
  others: relativePoint(481, 314),
};

const GENDER_CHECKBOXES = {
  man: relativePoint(188, 454),
  woman: relativePoint(271, 454),
  other: relativePoint(378, 454),
  prefer: relativePoint(556, 454),
};

const parseEmergencyContact = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') {
    return {
      name: raw.fullName ?? raw.name ?? '',
      address: raw.address ?? '',
      phone: raw.phone ?? raw.contactNo ?? '',
      relationship: raw.relationship ?? '',
    };
  }

  const [nameAndRelation, phonePart] = String(raw).split(/[•|-]/).map((segment) => segment?.trim() ?? '');
  const relationMatch = nameAndRelation?.match(/\((.*?)\)/);
  return {
    name: relationMatch ? nameAndRelation.replace(relationMatch[0], '').trim() : nameAndRelation,
    phone: phonePart ?? '',
    relationship: relationMatch ? relationMatch[1] : '',
    address: '',
  };
};

const getDefaultTemplateUrl = () => {
  if (process.env.REACT_APP_MEMBERSHIP_TEMPLATE_URL) {
    return process.env.REACT_APP_MEMBERSHIP_TEMPLATE_URL;
  }
  const publicUrl = (process.env.PUBLIC_URL ?? '').replace(/\/$/, '');
  if (publicUrl) {
    return `${publicUrl}${DEFAULT_TEMPLATE_PATH}`;
  }
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${DEFAULT_TEMPLATE_PATH}`;
  }
  return DEFAULT_TEMPLATE_PATH;
};

const loadTemplateImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Unable to load membership form template from ${url}`));
  img.src = url;
});

const tryLoadTemplateImage = async (url) => {
  if (!url) return null;
  try {
    return await loadTemplateImage(url);
  } catch (err) {
    console.warn(err.message);
    return null;
  }
};

const imageToPngDataUrl = (image) => {
  if (!image || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || CANONICAL_TEMPLATE_SIZE.width;
  canvas.height = image.naturalHeight || CANONICAL_TEMPLATE_SIZE.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
};

const markCheckbox = (doc, coords, origin, dimensions) => {
  if (!coords) return;
  const size = dimensions.width * 0.015;
  doc.setFontSize(12);
  doc.text('X', origin.x + coords.x * dimensions.width, origin.y + coords.y * dimensions.height, {
    baseline: 'top',
  });
  doc.setFontSize(9);
  return size;
};

const drawField = (doc, text, coords, origin, dimensions) => {
  if (!text || !coords) return;
  const value = normalize(text);
  if (!value) return;
  doc.setFontSize(9);
  const maxWidth = coords.width ? coords.width * dimensions.width : undefined;
  const lines = maxWidth ? doc.splitTextToSize(value, maxWidth) : value;
  doc.text(lines, origin.x + coords.x * dimensions.width, origin.y + coords.y * dimensions.height, {
    baseline: 'top',
  });
};

export const exportMembershipForm = async (member = {}, options = {}) => {
  const templateUrl = options.templateUrl ?? getDefaultTemplateUrl();
  let templateImage = await tryLoadTemplateImage(templateUrl);
  if (!templateImage) {
    templateImage = await tryLoadTemplateImage(EMBEDDED_TEMPLATE_DATA_URL);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  doc.setTextColor(15, 23, 42);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const templateWidth = templateImage?.naturalWidth ?? CANONICAL_TEMPLATE_SIZE.width;
  const templateHeight = templateImage?.naturalHeight ?? CANONICAL_TEMPLATE_SIZE.height;
  const scale = Math.min(pageWidth / templateWidth, pageHeight / templateHeight);
  const drawnWidth = templateWidth * scale;
  const drawnHeight = templateHeight * scale;
  const offsetX = (pageWidth - drawnWidth) / 2;
  const offsetY = (pageHeight - drawnHeight) / 2;

  if (templateImage) {
    const pngData = imageToPngDataUrl(templateImage);
    if (pngData) {
      doc.addImage(pngData, 'PNG', offsetX, offsetY, drawnWidth, drawnHeight);
    }
  }

  const origin = { x: offsetX, y: offsetY };
  const dimensions = { width: drawnWidth, height: drawnHeight };

  const emergencyContact = parseEmergencyContact(member.emergencyContact ?? member.emergencyContactName);

  drawField(doc, member.fullName, FIELD_COORDS.fullName, origin, dimensions);
  drawField(doc, member.placeOfBirth ?? member.birthPlace, FIELD_COORDS.placeOfBirth, origin, dimensions);
  drawField(doc, formatDateText(member.dateOfBirth), FIELD_COORDS.dateOfBirth, origin, dimensions);
  drawField(doc, member.address, FIELD_COORDS.address, origin, dimensions);
  drawField(doc, calculateAge(member.dateOfBirth), FIELD_COORDS.age, origin, dimensions);
  drawField(doc, member.education, FIELD_COORDS.education, origin, dimensions);
  drawField(doc, member.numberOfChildren, FIELD_COORDS.children, origin, dimensions);
  drawField(doc, member.religion, FIELD_COORDS.religion, origin, dimensions);
  drawField(doc, member.mobile ?? member.phone, FIELD_COORDS.contactNumber, origin, dimensions);
  drawField(doc, member.email, FIELD_COORDS.email, origin, dimensions);
  drawField(doc, member.genderOther, FIELD_COORDS.genderOther, origin, dimensions);

  drawField(doc, member.company, FIELD_COORDS.employer, origin, dimensions);
  drawField(doc, member.position, FIELD_COORDS.position, origin, dimensions);
  drawField(doc, member.department, FIELD_COORDS.unitSection, origin, dimensions);
  drawField(doc, member.yearsEmployed ? `${member.yearsEmployed}` : '', FIELD_COORDS.yearsEmployed, origin, dimensions);
  drawField(doc, member.unionAffiliation, FIELD_COORDS.unionName, origin, dimensions);
  drawField(doc, member.unionPosition, FIELD_COORDS.unionPosition, origin, dimensions);
  drawField(doc, formatDateText(member.registeredDate ?? member.joinDate), FIELD_COORDS.membershipDate, origin, dimensions);

  drawField(doc, emergencyContact.name, FIELD_COORDS.emergencyName, origin, dimensions);
  drawField(doc, emergencyContact.address, FIELD_COORDS.emergencyAddress, origin, dimensions);
  drawField(doc, emergencyContact.phone, FIELD_COORDS.emergencyContact, origin, dimensions);
  drawField(doc, emergencyContact.relationship, FIELD_COORDS.emergencyRelationship, origin, dimensions);

  const statusValue = normalize(member.maritalStatus).toLowerCase();
  if (statusValue) {
    const key = (() => {
      if (statusValue.startsWith('sing')) return 'single';
      if (statusValue.startsWith('mar')) return 'married';
      if (statusValue.startsWith('div') || statusValue.startsWith('sep') || statusValue.startsWith('wid')) return 'divorce';
      return 'others';
    })();
    markCheckbox(doc, STATUS_CHECKBOXES[key], origin, dimensions);
    if (key === 'others') {
      drawField(doc, member.maritalStatus, FIELD_COORDS.statusOther, origin, dimensions);
    }
  }

  const genderValue = normalize(member.gender).toLowerCase();
  if (genderValue) {
    const genderKey = (() => {
      if (genderValue.startsWith('m')) return 'man';
      if (genderValue.startsWith('f')) return 'woman';
      if (genderValue.includes('prefer')) return 'prefer';
      return 'other';
    })();
    markCheckbox(doc, GENDER_CHECKBOXES[genderKey], origin, dimensions);
    if (genderKey === 'other') {
      drawField(doc, member.gender, FIELD_COORDS.genderOther, origin, dimensions);
    }
  }

  const filenameSafeId = normalize(member.memberID ?? member.fullName ?? 'alu-member')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const today = new Date().toISOString().split('T')[0];
  doc.save(`${filenameSafeId || 'alu-member'}-membership-${today}.pdf`);
};
