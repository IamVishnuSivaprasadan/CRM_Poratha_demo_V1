import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  User,
  UserRole,
  Branch,
  Department,
  Employee,
  DocumentRequirement,
  DocumentRecord,
  DocumentVersion,
  DocumentVerification,
  NotificationItem,
  AuditLog,
  DocumentStatus,
  RejectionReasonCode,
  AuditAction,
} from '../types/index.js';

interface DatabaseSchema {
  users: User[];
  branches: Branch[];
  departments: Department[];
  employees: Employee[];
  documentRequirements: DocumentRequirement[];
  documents: DocumentRecord[];
  documentVersions: DocumentVersion[];
  documentVerifications: DocumentVerification[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

export class Database {
  private static instance: Database;
  private dbPath: string;
  private data: DatabaseSchema;
  private isSaving: boolean = false;

  private constructor() {
    const storageDir = path.resolve(process.cwd(), './storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const filesDir = path.resolve(storageDir, './files');
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    this.dbPath = path.resolve(storageDir, 'poratha.db.json');
    this.data = this.loadDatabase();
    this.ensureSeedData();
    this.evaluateExpiryStatus();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error reading database file, initializing fresh:', err);
      }
    }
    return {
      users: [],
      branches: [],
      departments: [],
      employees: [],
      documentRequirements: [],
      documents: [],
      documentVersions: [],
      documentVerifications: [],
      notifications: [],
      auditLogs: [],
    };
  }

  public saveDatabase(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save database to disk:', err);
    }
  }

  public evaluateExpiryStatus(): void {
    const today = new Date().toISOString().split('T')[0];
    let updated = false;

    this.data.documents.forEach((doc) => {
      if (doc.status === DocumentStatus.VERIFIED && doc.expiryDate && doc.expiryDate < today) {
        doc.status = DocumentStatus.EXPIRED;
        doc.updatedAt = new Date().toISOString();
        updated = true;

        // Log audit
        this.addAuditLog({
          id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          userId: 'system',
          userName: 'System Expiry Engine',
          userRole: UserRole.SUPER_ADMIN,
          action: AuditAction.DOCUMENT_VERIFIED,
          entity: 'Document',
          entityId: doc.id,
          details: `Document ${doc.documentNumber} (${doc.title}) expired automatically on ${doc.expiryDate}`,
          previousValue: { status: DocumentStatus.VERIFIED },
          newValue: { status: DocumentStatus.EXPIRED },
        });

        // Add alert notification for branch
        this.data.notifications.unshift({
          id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          targetRole: UserRole.BRANCH_MANAGER,
          targetBranchId: doc.branchId,
          title: `Document Expired: ${doc.title}`,
          message: `Document ${doc.documentNumber} for ${doc.employeeName || 'Department'} has expired on ${doc.expiryDate}. Please upload a renewal.`,
          type: 'ERROR',
          documentId: doc.id,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (updated) {
      this.saveDatabase();
    }
  }

  // Getters & Collections
  public getUsers(): User[] {
    return this.data.users;
  }
  public getBranches(): Branch[] {
    return this.data.branches;
  }
  public getDepartments(): Department[] {
    return this.data.departments;
  }
  public getEmployees(): Employee[] {
    return this.data.employees;
  }
  public getRequirements(): DocumentRequirement[] {
    return this.data.documentRequirements;
  }
  public getDocuments(): DocumentRecord[] {
    return this.data.documents;
  }
  public getDocumentVersions(): DocumentVersion[] {
    return this.data.documentVersions;
  }
  public getVerifications(): DocumentVerification[] {
    return this.data.documentVerifications;
  }
  public getNotifications(): NotificationItem[] {
    return this.data.notifications;
  }
  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  public addAuditLog(log: AuditLog): void {
    this.data.auditLogs.unshift(log);
    // Keep max 2000 logs in memory/disk
    if (this.data.auditLogs.length > 2000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 2000);
    }
    this.saveDatabase();
  }

  public addNotification(notification: NotificationItem): void {
    this.data.notifications.unshift(notification);
    if (this.data.notifications.length > 500) {
      this.data.notifications = this.data.notifications.slice(0, 500);
    }
    this.saveDatabase();
  }

  // Initial Seed Data Generator
  private ensureSeedData(): void {
    if (this.data.branches.length > 0 && this.data.users.length > 0) {
      return;
    }

    console.log('Seeding initial Poratha Corporation database...');

    // 1. Branches
    const branches: Branch[] = [
      {
        id: 'br_01',
        code: 'BR-01-JB',
        name: 'Branch 1 — Johor Bahru Fabrication Yard',
        location: 'Pasir Gudang Industrial Estate, Johor',
        state: 'Johor',
        contactPerson: 'Ahmad Farhan Bin Rosli',
        email: 'jb.yard@poratha.my',
        phone: '+60 7-251 8890',
        isActive: true,
        createdAt: '2025-01-10T08:00:00.000Z',
      },
      {
        id: 'br_02',
        code: 'BR-02-KTH',
        name: 'Branch 2 — Kertih Petrochemical Hub',
        location: 'Kertih Industrial Area, Terengganu',
        state: 'Terengganu',
        contactPerson: 'Tan Wei Kang',
        email: 'kertih.ops@poratha.my',
        phone: '+60 9-827 4411',
        isActive: true,
        createdAt: '2025-01-10T08:00:00.000Z',
      },
      {
        id: 'br_03',
        code: 'BR-03-BTU',
        name: 'Branch 3 — Bintulu Heavy Fabrication Yard',
        location: 'Kidurong Industrial Area, Bintulu, Sarawak',
        state: 'Sarawak',
        contactPerson: 'Siti Nur Aisyah',
        email: 'bintulu.yard@poratha.my',
        phone: '+60 86-253 100',
        isActive: true,
        createdAt: '2025-01-12T08:00:00.000Z',
      },
      {
        id: 'br_04',
        code: 'BR-04-PGR',
        name: 'Branch 4 — Pengerang Integrated Complex (PIC)',
        location: 'Pengerang Integrated Petroleum Complex, Johor',
        state: 'Johor',
        contactPerson: 'Muthusamy A/L Loganathan',
        email: 'pengerang.site@poratha.my',
        phone: '+60 7-826 9900',
        isActive: true,
        createdAt: '2025-01-15T08:00:00.000Z',
      },
      {
        id: 'br_05',
        code: 'BR-05-GBG',
        name: 'Branch 5 — Gebeng Industrial Port Operations',
        location: 'Gebeng Industrial Estate, Kuantan, Pahang',
        state: 'Pahang',
        contactPerson: 'Zulkifli Bin Hassan',
        email: 'gebeng.port@poratha.my',
        phone: '+60 9-583 3312',
        isActive: true,
        createdAt: '2025-01-20T08:00:00.000Z',
      },
    ];

    // 2. Departments
    const departments: Department[] = [
      {
        id: 'dept_01',
        code: 'DEPT-HR-HSE',
        name: 'Department 1 — Human Resources & HSE (Safety)',
        description: 'Personnel documentation, CIDB Green Cards, OGSP, Medical fitness, Work Permits, Passport/Visas',
        headOfDepartment: 'Dr. Zulaikha Binti Mansor',
        isActive: true,
        createdAt: '2025-01-10T08:00:00.000Z',
      },
      {
        id: 'dept_02',
        code: 'DEPT-QAQC',
        name: 'Department 2 — Quality Assurance & QA/QC Inspection',
        description: 'WPS, PQR, Welder Certifications, NDT Inspection Reports, Material Test Certificates, Calibration Logs',
        headOfDepartment: 'Engr. David Chong Kian Boon',
        isActive: true,
        createdAt: '2025-01-10T08:00:00.000Z',
      },
      {
        id: 'dept_03',
        code: 'DEPT-ENG-OPS',
        name: 'Department 3 — Engineering & Mechanical Operations',
        description: 'Piping Isometrics, Structural GA Drawings, Heavy Lifting Plans, DOSH Crane Certifications, PTW',
        headOfDepartment: 'Ir. Harish Kumar',
        isActive: true,
        createdAt: '2025-01-10T08:00:00.000Z',
      },
    ];

    // 3. Password hash for demo users: "poratha2026"
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('poratha2026', salt);

    // 4. Users across all roles
    const users: User[] = [
      {
        id: 'usr_superadmin',
        email: 'superadmin@poratha.my',
        passwordHash,
        name: 'Dato’ Sri Mohan Poratha',
        role: UserRole.SUPER_ADMIN,
        phone: '+60 3-8060 1100',
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'usr_headoffice_01',
        email: 'headoffice@poratha.my',
        passwordHash,
        name: 'Nurul Huda (Lead Document Controller - HQ)',
        role: UserRole.HEAD_OFFICE_ADMIN,
        phone: '+60 3-8060 1122',
        isActive: true,
        createdAt: '2025-01-05T00:00:00.000Z',
      },
      {
        id: 'usr_headoffice_02',
        email: 'qaqc.verifier@poratha.my',
        passwordHash,
        name: 'Suresh Krishnan (Senior QA/QC Verifier - HQ)',
        role: UserRole.HEAD_OFFICE_ADMIN,
        phone: '+60 3-8060 1133',
        isActive: true,
        createdAt: '2025-01-05T00:00:00.000Z',
      },
      {
        id: 'usr_branch_01',
        email: 'branch1.manager@poratha.my',
        passwordHash,
        name: 'Ahmad Farhan (Manager - Branch 1 JB)',
        role: UserRole.BRANCH_MANAGER,
        branchId: 'br_01',
        branchName: 'Branch 1 — Johor Bahru Fabrication Yard',
        phone: '+60 7-251 8890',
        isActive: true,
        createdAt: '2025-01-10T00:00:00.000Z',
      },
      {
        id: 'usr_branch_02',
        email: 'branch2.manager@poratha.my',
        passwordHash,
        name: 'Tan Wei Kang (Manager - Branch 2 Kertih)',
        role: UserRole.BRANCH_MANAGER,
        branchId: 'br_02',
        branchName: 'Branch 2 — Kertih Petrochemical Hub',
        phone: '+60 9-827 4411',
        isActive: true,
        createdAt: '2025-01-10T00:00:00.000Z',
      },
      {
        id: 'usr_branch_03',
        email: 'branch3.manager@poratha.my',
        passwordHash,
        name: 'Siti Nur Aisyah (Manager - Branch 3 Bintulu)',
        role: UserRole.BRANCH_MANAGER,
        branchId: 'br_03',
        branchName: 'Branch 3 — Bintulu Heavy Fabrication Yard',
        phone: '+60 86-253 100',
        isActive: true,
        createdAt: '2025-01-12T00:00:00.000Z',
      },
      {
        id: 'usr_branch_04',
        email: 'branch4.manager@poratha.my',
        passwordHash,
        name: 'Muthusamy Loganathan (Manager - Branch 4 Pengerang)',
        role: UserRole.BRANCH_MANAGER,
        branchId: 'br_04',
        branchName: 'Branch 4 — Pengerang Integrated Complex',
        phone: '+60 7-826 9900',
        isActive: true,
        createdAt: '2025-01-15T00:00:00.000Z',
      },
      {
        id: 'usr_branch_05',
        email: 'branch5.manager@poratha.my',
        passwordHash,
        name: 'Zulkifli Hassan (Manager - Branch 5 Gebeng)',
        role: UserRole.BRANCH_MANAGER,
        branchId: 'br_05',
        branchName: 'Branch 5 — Gebeng Industrial Port Operations',
        phone: '+60 9-583 3312',
        isActive: true,
        createdAt: '2025-01-20T00:00:00.000Z',
      },
      {
        id: 'usr_dept_01_br1',
        email: 'dept1.jb@poratha.my',
        passwordHash,
        name: 'Faizal Ridzuan (HSE Officer - Branch 1 JB)',
        role: UserRole.DEPARTMENT_USER,
        branchId: 'br_01',
        branchName: 'Branch 1 — Johor Bahru Fabrication Yard',
        departmentId: 'dept_01',
        departmentName: 'Department 1 — Human Resources & HSE (Safety)',
        phone: '+60 7-251 8891',
        isActive: true,
        createdAt: '2025-01-11T00:00:00.000Z',
      },
      {
        id: 'usr_dept_02_br1',
        email: 'dept2.jb@poratha.my',
        passwordHash,
        name: 'Goh Boon Huat (QA/QC Inspector - Branch 1 JB)',
        role: UserRole.DEPARTMENT_USER,
        branchId: 'br_01',
        branchName: 'Branch 1 — Johor Bahru Fabrication Yard',
        departmentId: 'dept_02',
        departmentName: 'Department 2 — Quality Assurance & QA/QC Inspection',
        phone: '+60 7-251 8892',
        isActive: true,
        createdAt: '2025-01-11T00:00:00.000Z',
      },
      {
        id: 'usr_dept_03_br1',
        email: 'dept3.jb@poratha.my',
        passwordHash,
        name: 'M. Ramesh (Engineering Site Lead - Branch 1 JB)',
        role: UserRole.DEPARTMENT_USER,
        branchId: 'br_01',
        branchName: 'Branch 1 — Johor Bahru Fabrication Yard',
        departmentId: 'dept_03',
        departmentName: 'Department 3 — Engineering & Mechanical Operations',
        phone: '+60 7-251 8893',
        isActive: true,
        createdAt: '2025-01-11T00:00:00.000Z',
      },
      {
        id: 'usr_viewonly',
        email: 'auditor@poratha.my',
        passwordHash,
        name: 'KPMG External Compliance Auditor',
        role: UserRole.VIEW_ONLY,
        phone: '+60 3-7721 3300',
        isActive: true,
        createdAt: '2025-01-25T00:00:00.000Z',
      },
    ];

    // 5. Document Requirements
    const documentRequirements: DocumentRequirement[] = [
      // Dept 1: HR & Safety (HSE)
      {
        id: 'req_01',
        code: 'REQ-CIDB',
        name: 'CIDB Green Card (Construction Personnel Card)',
        category: 'Safety & Regulatory',
        departmentId: 'dept_01',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 730,
        verificationRequired: true,
        description: 'Mandatory CIDB Green Card registration for all yard & site personnel in Malaysia.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_02',
        code: 'REQ-OGSP',
        name: 'OGSP / Oil & Gas Safety Passport',
        category: 'Safety & Regulatory',
        departmentId: 'dept_01',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 1095,
        verificationRequired: true,
        description: 'NIOSH-Petronas Safety Passport for entry into refinery and gas plants.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_03',
        code: 'REQ-FOMEMA',
        name: 'Medical Fitness Certificate (FOMEMA / Occupational Health)',
        category: 'Health & Medical',
        departmentId: 'dept_01',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 365,
        verificationRequired: true,
        description: 'Annual fit-for-work medical screening endorsed by OHD.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_04',
        code: 'REQ-IDPASS',
        name: 'Passport & Valid Employment Pass / Visa',
        category: 'Legal & HR',
        departmentId: 'dept_01',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 365,
        verificationRequired: true,
        description: 'National passport bio-page and valid working visa / expatriate pass.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_05',
        code: 'REQ-WAH',
        name: 'Working At Heights (WAH) Level 2 Certificate',
        category: 'Safety & Regulatory',
        departmentId: 'dept_01',
        isRequired: false,
        expiryRequired: true,
        renewalPeriodDays: 730,
        verificationRequired: true,
        description: 'Certified scaffolding / high-elevation safety harness credential.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_06',
        code: 'REQ-CONFSPACE',
        name: 'Authorized Entrant & Standby Person for Confined Space (AESP)',
        category: 'Safety & Regulatory',
        departmentId: 'dept_01',
        isRequired: false,
        expiryRequired: true,
        renewalPeriodDays: 730,
        verificationRequired: true,
        description: 'NIOSH DOSH Confined Space entry authorization.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },

      // Dept 2: QA/QC
      {
        id: 'req_07',
        code: 'REQ-WQT',
        name: 'Welder Performance Qualification Test Record (WPQR/6G)',
        category: 'Technical Certification',
        departmentId: 'dept_02',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 180,
        verificationRequired: true,
        description: 'ASME Section IX / AWS D1.1 certified 6G pipe welding qualification certificate.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_08',
        code: 'REQ-NDT',
        name: 'Non-Destructive Testing (NDT Level II Radiography/UT)',
        category: 'Technical Certification',
        departmentId: 'dept_02',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 1095,
        verificationRequired: true,
        description: 'PCN / CSWIP Level 2 NDT certification for weld joint evaluation.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_09',
        code: 'REQ-MTC',
        name: 'Mill Material Test Certificate (EN 10204 3.1 / 3.2)',
        category: 'Material Quality',
        departmentId: 'dept_02',
        isRequired: true,
        expiryRequired: false,
        renewalPeriodDays: 0,
        verificationRequired: true,
        description: 'Batch metallurgy chemical composition and tensile mechanical test report.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_10',
        code: 'REQ-CALIB',
        name: 'Welding Machine & Pressure Gauge Calibration Certificate',
        category: 'Equipment Calibration',
        departmentId: 'dept_02',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 365,
        verificationRequired: true,
        description: 'SAMM accredited laboratory calibration certificate.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },

      // Dept 3: Engineering & Operations
      {
        id: 'req_11',
        code: 'REQ-LIFTPLAN',
        name: 'Engineered Heavy Lift Plan & Rigging Calculation',
        category: 'Engineering & Method',
        departmentId: 'dept_03',
        isRequired: true,
        expiryRequired: false,
        renewalPeriodDays: 0,
        verificationRequired: true,
        description: 'Critical lift engineering assessment signed by Professional Engineer (PE).',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_12',
        code: 'REQ-DOSHPMA',
        name: 'DOSH PMA Certificate of Fitness for Heavy Mobile Crane',
        category: 'Statutory Inspection',
        departmentId: 'dept_03',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 450,
        verificationRequired: true,
        description: 'Department of Occupational Safety & Health (DOSH) Perakuan Kelayakan Mesin Angkat.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_13',
        code: 'REQ-PTW',
        name: 'Permit To Work (PTW) Hot Work & Radiography Isolation Form',
        category: 'Site Execution',
        departmentId: 'dept_03',
        isRequired: true,
        expiryRequired: true,
        renewalPeriodDays: 30,
        verificationRequired: true,
        description: 'Site PTW approval with gas test results and fire watch endorsement.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'req_14',
        code: 'REQ-ISOMETRIC',
        name: 'Piping Isometric Approved For Construction (AFC) Drawing',
        category: 'Engineering Drawings',
        departmentId: 'dept_03',
        isRequired: true,
        expiryRequired: false,
        renewalPeriodDays: 0,
        verificationRequired: true,
        description: 'Client approved AFC piping isometric with bill of materials & weld maps.',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    // 6. Generate 50 realistic industrial employees distributed across 5 branches and 3 departments
    const employeeNames = [
      'Mohd Azlan Bin Kassim', 'Siti Rahayu Binti Yusof', 'K. Vigneswaran', 'Chong Wei Lun',
      'Kamal Ariffin Bin Daud', 'Nadia Syahirah Binti Azmi', 'R. Saravanan', 'Lee Mei Ling',
      'Zainal Abidin Bin Othman', 'Norhaslinda Binti Mat', 'Tan Kok Leong', 'P. Anandaraj',
      'Hafizul Bin Shahril', 'Nur Fadhilah Binti Ramli', 'Cheah Kah Fai', 'S. Jayakumar',
      'Shamsul Bahari Bin Ali', 'Mastura Binti Ibrahim', 'Lim Jian Feng', 'M. Logendran',
      'Khairul Naim Bin Razali', 'Sharifah Munirah Binti Syed', 'Ng Swee Seng', 'A. Thilak',
      'Badrul Hisham Bin Ismail', 'Azlina Binti Mansor', 'Teo Boon Hwee', 'G. Gopinath',
      'Wan Faizul Bin Wan Omar', 'Farihah Binti Abdullah', 'Khoo Seng Tat', 'V. Selvam',
      'Amirul Syafiq Bin Roslan', 'Siti Khatijah Binti Zakaria', 'Law Chee Keong', 'T. Ravi',
      'Mustafa Bin Abu Bakar', 'Roslina Binti Hamzah', 'Wong Kar Wai', 'K. Parthiban',
      'Iskandar Shah Bin Johan', 'Aimi Nadiah Binti Fuad', 'Yap Kah Meng', 'S. Mahendran',
      'Tengku Aris Bin Tengku Din', 'Rohaya Binti Sulaiman', 'Low Teck Hock', 'N. Gunasegaran',
      'Syed Hamzah Bin Al-Attas', 'Zalina Binti Ahmad', 'Chan Mun Kit', 'D. Sivabalan'
    ];

    const designationsDept1 = ['HSE Officer', 'Safety Supervisor', 'Scaffolding Inspector', 'First Aider', 'HR Executive'];
    const designationsDept2 = ['Senior QA/QC Engineer', '6G SMAW/GTAW Welder', 'NDT Level II Technician', 'Welding Inspector CSWIP 3.1', 'Dimensional Control Tech'];
    const designationsDept3 = ['Piping Lead Engineer', 'Heavy Lift Rigger', 'Mechanical Superintendent', 'Crane Operator (DOSH Grade 1)', 'Structural Fabricator'];

    const employees: Employee[] = [];
    let empCounter = 101;

    for (let i = 0; i < employeeNames.length; i++) {
      const branchIndex = i % 5;
      const deptIndex = i % 3;
      const branch = branches[branchIndex];
      const dept = departments[deptIndex];

      let desigList = designationsDept1;
      if (deptIndex === 1) desigList = designationsDept2;
      if (deptIndex === 2) desigList = designationsDept3;
      const designation = desigList[i % desigList.length];

      const empNum = `PRT-${branch.code.split('-')[1]}-${empCounter++}`;
      const name = employeeNames[i];
      const icPassport = (i % 4 === 0) ? `E${70000000 + i}` : `${850000 + i * 13}-01-${5000 + i * 7}`;

      employees.push({
        id: `emp_${i + 1}`,
        employeeNumber: empNum,
        fullName: name,
        icOrPassport: icPassport,
        designation,
        branchId: branch.id,
        departmentId: dept.id,
        joiningDate: `2024-0${(i % 9) + 1}-15`,
        contactNumber: `+60 1${(i % 9) + 1}-${2000000 + i * 3421}`,
        email: `${name.toLowerCase().replace(/[^a-z]/g, '.').slice(0, 15)}@poratha.my`,
        status: i % 15 === 0 ? 'ON_LEAVE' : 'ACTIVE',
        createdAt: '2025-01-05T00:00:00.000Z',
      });
    }

    // 7. Generate Document Records, Versions, Verifications, and Rejections
    const documents: DocumentRecord[] = [];
    const documentVersions: DocumentVersion[] = [];
    const documentVerifications: DocumentVerification[] = [];
    const auditLogs: AuditLog[] = [];
    const notifications: NotificationItem[] = [];

    // Create a real sample PDF in ./storage/files
    const samplePdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 85>>stream\nBT /F1 20 Tf 50 700 Td (PORATHA CORPORATION - OFFICIAL VERIFIED DOCUMENT ARCHIVE) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n352\n%%EOF'
    );
    const sampleStorageKey = 'sample_poratha_cert_2026.pdf';
    const samplePath = path.resolve(process.cwd(), './storage/files', sampleStorageKey);
    try {
      fs.writeFileSync(samplePath, samplePdfBuffer);
    } catch (e) {
      console.warn('Could not write sample pdf:', e);
    }

    let docCounter = 1000;
    const now = new Date();

    // Loop through each employee and map their department's document requirements
    employees.forEach((emp, empIdx) => {
      const applicableReqs = documentRequirements.filter(
        (r) => r.departmentId === emp.departmentId && (!r.applicableBranchId || r.applicableBranchId === emp.branchId)
      );

      applicableReqs.forEach((req, reqIdx) => {
        docCounter++;
        const docId = `doc_${docCounter}`;
        const docNumber = `PRT-DOC-${emp.branchId.toUpperCase().replace('BR_', 'B')}-${docCounter}`;

        // Create varied states across the dataset:
        // We want a realistic distribution:
        // - ~65% VERIFIED
        // - ~15% PENDING_VERIFICATION
        // - ~8% REJECTED
        // - ~7% EXPIRED
        // - ~5% NOT_UPLOADED (missing)

        const stateSeed = (empIdx * 7 + reqIdx * 11) % 100;
        let status: DocumentStatus;
        let expiryDate: string | null = null;
        let issueDate: string = '2024-06-15';
        let lastVerifiedAt: string | null = null;
        let lastVerifiedById: string | null = null;
        let lastVerifiedByName: string | null = null;
        let lastRejectionReason: string | null = null;
        let lastRejectionComments: string | null = null;
        let currentVersionNumber = 1;
        let hasVersions = true;

        if (stateSeed < 60) {
          status = DocumentStatus.VERIFIED;
          expiryDate = req.expiryRequired ? '2026-11-20' : null;
          lastVerifiedAt = '2025-02-10T14:30:00.000Z';
          lastVerifiedById = 'usr_headoffice_01';
          lastVerifiedByName = 'Nurul Huda (Lead Document Controller - HQ)';
        } else if (stateSeed < 75) {
          status = DocumentStatus.PENDING_VERIFICATION;
          expiryDate = req.expiryRequired ? '2026-12-31' : null;
        } else if (stateSeed < 85) {
          status = DocumentStatus.REJECTED;
          expiryDate = req.expiryRequired ? '2024-12-01' : null;
          lastRejectionReason = RejectionReasonCode.POOR_SCAN_QUALITY;
          lastRejectionComments = 'Scan resolution is blurry and certificate seal is unreadable. Please re-scan high-res 300dpi PDF.';
        } else if (stateSeed < 93) {
          status = DocumentStatus.EXPIRED;
          expiryDate = '2025-01-01'; // Expired past date
          lastVerifiedAt = '2024-01-05T09:00:00.000Z';
          lastVerifiedById = 'usr_headoffice_02';
          lastVerifiedByName = 'Suresh Krishnan (Senior QA/QC Verifier - HQ)';
        } else {
          // NOT UPLOADED (Missing required document!)
          status = DocumentStatus.NOT_UPLOADED;
          hasVersions = false;
        }

        let currentVersionId: string | null = null;

        if (hasVersions) {
          const versionId = `ver_${docCounter}_v1`;
          currentVersionId = versionId;

          const ver: DocumentVersion = {
            id: versionId,
            documentId: docId,
            versionNumber: 1,
            storageKey: sampleStorageKey,
            originalFilename: `${req.code.toLowerCase()}_${emp.fullName.toLowerCase().replace(/[^a-z]/g, '_')}.pdf`,
            mimeType: 'application/pdf',
            fileSize: 48291,
            checksum: crypto.createHash('sha256').update(samplePdfBuffer).digest('hex'),
            uploadedById: `usr_dept_0${emp.departmentId.split('_')[1]}_br1` || 'usr_branch_01',
            uploadedByName: `${emp.fullName} (Supervisor)`,
            uploadedAt: '2025-01-18T10:00:00.000Z',
            notes: `Initial submission for ${req.name}`,
            ocrText: `PORATHA CORPORATION BHD - ${req.name} - REG: ${emp.icOrPassport} - EMP: ${emp.fullName}`,
          };
          documentVersions.push(ver);

          // Add verification or rejection records
          if (status === DocumentStatus.VERIFIED || status === DocumentStatus.EXPIRED) {
            documentVerifications.push({
              id: `vrec_${docCounter}_1`,
              documentId: docId,
              documentVersionId: versionId,
              action: 'VERIFIED',
              verifiedById: lastVerifiedById || 'usr_headoffice_01',
              verifiedByName: lastVerifiedByName || 'Nurul Huda (Lead Document Controller - HQ)',
              comments: 'Verified against national registrar and accreditation board standards.',
              createdAt: lastVerifiedAt || '2025-02-10T14:30:00.000Z',
            });
          } else if (status === DocumentStatus.REJECTED) {
            documentVerifications.push({
              id: `vrec_${docCounter}_1`,
              documentId: docId,
              documentVersionId: versionId,
              action: 'REJECTED',
              verifiedById: 'usr_headoffice_01',
              verifiedByName: 'Nurul Huda (Lead Document Controller - HQ)',
              comments: lastRejectionComments || 'Scan is illegible.',
              reasonCode: (lastRejectionReason as RejectionReasonCode) || RejectionReasonCode.POOR_SCAN_QUALITY,
              reasonText: lastRejectionComments || 'Scan is illegible.',
              createdAt: '2025-02-12T11:20:00.000Z',
            });
          }
        }

        const branchObj = branches.find((b) => b.id === emp.branchId)!;
        const deptObj = departments.find((d) => d.id === emp.departmentId)!;

        documents.push({
          id: docId,
          documentNumber: docNumber,
          title: `${req.name} — ${emp.fullName}`,
          requirementId: req.id,
          requirementName: req.name,
          category: req.category,
          branchId: emp.branchId,
          branchName: branchObj.name,
          departmentId: emp.departmentId,
          departmentName: deptObj.name,
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeNumber: emp.employeeNumber,
          status,
          currentVersionId,
          currentVersionNumber,
          expiryDate,
          issueDate,
          lastVerifiedAt,
          lastVerifiedById,
          lastVerifiedByName,
          lastRejectionReason,
          lastRejectionComments,
          createdById: 'usr_headoffice_01',
          createdByName: 'Nurul Huda (HQ)',
          createdAt: '2025-01-18T10:00:00.000Z',
          updatedAt: '2025-02-12T11:20:00.000Z',
        });
      });
    });

    // 8. Sample Notifications
    notifications.push(
      {
        id: 'notif_init_01',
        targetRole: UserRole.HEAD_OFFICE_ADMIN,
        title: 'New Documents Awaiting Review',
        message: 'Multiple branches have submitted welder certifications and safety passports for verification.',
        type: 'INFO',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notif_init_02',
        targetRole: UserRole.BRANCH_MANAGER,
        targetBranchId: 'br_01',
        title: 'Action Required: Rejected Document',
        message: 'Welder qualification certificate for Mohd Azlan Bin Kassim was rejected: Poor scan quality.',
        type: 'ERROR',
        documentId: 'doc_1001',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'notif_init_03',
        targetRole: UserRole.BRANCH_MANAGER,
        targetBranchId: 'br_02',
        title: 'Expiry Notice: 4 Documents Expiring in 30 Days',
        message: 'Branch 2 has 4 CIDB cards and medical fitness certificates expiring next month.',
        type: 'WARNING',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      }
    );

    // 9. Initial Audit Logs
    auditLogs.push(
      {
        id: 'audit_01',
        timestamp: '2025-01-01T00:00:00.000Z',
        userId: 'usr_superadmin',
        userName: 'Dato’ Sri Mohan Poratha',
        userRole: UserRole.SUPER_ADMIN,
        action: AuditAction.BRANCH_CREATED,
        entity: 'System',
        entityId: 'SYSTEM_BOOT',
        details: 'Initial Poratha Document Control organizational structure initialized with 5 regional branches and 3 technical departments.',
      },
      {
        id: 'audit_02',
        timestamp: '2025-01-18T10:00:00.000Z',
        userId: 'usr_dept_01_br1',
        userName: 'Faizal Ridzuan (HSE Officer - Branch 1 JB)',
        userRole: UserRole.DEPARTMENT_USER,
        userBranchId: 'br_01',
        action: AuditAction.DOCUMENT_UPLOADED,
        entity: 'Document',
        entityId: 'doc_1001',
        details: 'Uploaded Version 1 of CIDB Green Card for Mohd Azlan Bin Kassim. Status set to PENDING_VERIFICATION.',
      },
      {
        id: 'audit_03',
        timestamp: '2025-02-12T11:20:00.000Z',
        userId: 'usr_headoffice_01',
        userName: 'Nurul Huda (Lead Document Controller - HQ)',
        userRole: UserRole.HEAD_OFFICE_ADMIN,
        action: AuditAction.DOCUMENT_REJECTED,
        entity: 'Document',
        entityId: 'doc_1001',
        details: 'Rejected Document PRT-DOC-B1-1001. Reason: POOR_SCAN_QUALITY. Comments: Scan resolution is blurry.',
      }
    );

    this.data = {
      users,
      branches,
      departments,
      employees,
      documentRequirements,
      documents,
      documentVersions,
      documentVerifications,
      notifications,
      auditLogs,
    };

    this.saveDatabase();
    console.log(`Poratha DB initialized with ${branches.length} branches, ${departments.length} departments, ${employees.length} employees, ${documentRequirements.length} requirements, and ${documents.length} document records.`);
  }
}
