import {
  LeadStatus,
  MessageStatus,
  MessageTemplate,
  MessageType,
  PaymentStatus,
  PrismaClient,
  Role,
  StudentStatus
} from "@prisma/client";

const prisma = new PrismaClient();

const academyName = "Bangalore Precision Shooting Academy";
const academySlug = "bangalore-precision-shooting-academy";

const firstNames = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Ishaan",
  "Kabir",
  "Arjun",
  "Rohan",
  "Dev",
  "Vihaan",
  "Reyansh",
  "Ananya",
  "Diya",
  "Meera",
  "Aadhya",
  "Saanvi",
  "Ira",
  "Tara",
  "Anika",
  "Nisha",
  "Priya"
];

const lastNames = [
  "Sharma",
  "Iyer",
  "Rao",
  "Nair",
  "Kapoor",
  "Menon",
  "Reddy",
  "Shetty",
  "Kulkarni",
  "Patel",
  "Das",
  "Joshi",
  "Naidu",
  "Bhat",
  "Pillai"
];

const guardianNames = [
  "Rajesh",
  "Suresh",
  "Anil",
  "Vikram",
  "Prakash",
  "Ritu",
  "Kavita",
  "Sunita",
  "Meghana",
  "Deepa",
  "Arvind",
  "Naveen",
  "Lakshmi",
  "Sanjay",
  "Pooja"
];

const sources = ["Website", "Walk-in", "Referral", "Instagram", "Google"];

function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function indianPhone(index: number) {
  return `+91 9${String(870000000 + index * 13791).slice(0, 9)}`;
}

function fullName(index: number) {
  return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
}

function guardianName(index: number) {
  return `${guardianNames[index % guardianNames.length]} ${lastNames[(index + 3) % lastNames.length]}`;
}

async function main() {
  await prisma.studentSession.deleteMany();
  await prisma.studentAuthOtp.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.authOtp.deleteMany();
  await prisma.messageRecipient.deleteMany();
  await prisma.message.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.studentActivity.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.academy.deleteMany();

  const academy = await prisma.academy.create({
    data: {
      name: academyName,
      slug: academySlug,
      address: "12, 4th Main Road, Indiranagar, Bengaluru, Karnataka 560038",
      phone: "+91 80456 78901",
      email: "admin@bpsa.example",
      businessHours: "Mon-Sat, 6:00 AM - 8:00 PM",
      brandPrimaryColor: "#111827",
      brandSecondaryColor: "#64748B"
    }
  });

  const owner = await prisma.user.create({
    data: {
      academyId: academy.id,
      name: "Neha Srinivasan",
      email: "owner@meten.local",
      phone: "+91 98765 43210",
      role: Role.OWNER,
      createdBy: academy.id,
      updatedBy: academy.id
    }
  });

  const staff = await prisma.user.create({
    data: {
      academyId: academy.id,
      name: "Karthik Rao",
      email: "staff@meten.local",
      phone: "+91 99887 76655",
      role: Role.STAFF,
      createdBy: owner.id,
      updatedBy: owner.id
    }
  });

  const leadStatuses = [
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.TRIAL_SCHEDULED,
    LeadStatus.TRIAL_COMPLETED,
    LeadStatus.JOINED,
    LeadStatus.LOST
  ];

  for (let index = 0; index < 30; index += 1) {
    const status = leadStatuses[index % leadStatuses.length];
    const lead = await prisma.lead.create({
      data: {
        academyId: academy.id,
        name: fullName(index),
        phone: indianPhone(index),
        email: `lead${index + 1}@example.com`,
        parentName: guardianName(index),
        studentAge: 8 + (index % 9),
        source: sources[index % sources.length],
        status,
        notes:
          status === LeadStatus.TRIAL_SCHEDULED
            ? "Parent asked for evening trial slot."
            : "Interested in beginner shooting program.",
        followUpDate:
          status === LeadStatus.JOINED || status === LeadStatus.LOST
            ? null
            : daysFromNow((index % 7) - 2),
        assignedToId: index % 2 === 0 ? owner.id : staff.id,
        createdBy: owner.id,
        updatedBy: owner.id
      }
    });

    await prisma.leadActivity.create({
      data: {
        academyId: academy.id,
        leadId: lead.id,
        type: "LEAD_CREATED",
        description: `Lead created from ${lead.source}.`,
        createdBy: owner.id,
        updatedBy: owner.id
      }
    });
  }

  const students = [];

  for (let index = 0; index < 100; index += 1) {
    const student = await prisma.student.create({
      data: {
        academyId: academy.id,
        fullName: fullName(index + 17),
        guardianName: guardianName(index + 9),
        phone: indianPhone(index + 100),
        email: `student${index + 1}@example.com`,
        joiningDate: daysFromNow(-index),
        status: index % 18 === 0 ? StudentStatus.INACTIVE : StudentStatus.ACTIVE,
        notes:
          index % 5 === 0
            ? "Prefers weekend training slots."
            : "Regular academy student.",
        createdBy: owner.id,
        updatedBy: owner.id
      }
    });

    students.push(student);

    await prisma.studentActivity.create({
      data: {
        academyId: academy.id,
        studentId: student.id,
        type: "STUDENT_CREATED",
        description: "Student admitted to the academy.",
        createdBy: owner.id,
        updatedBy: owner.id
      }
    });
  }

  for (let index = 0; index < 75; index += 1) {
    const paid = index % 3 === 0;
    const overdue = !paid && index % 4 === 0;
    const dueDate = daysFromNow(overdue ? -((index % 8) + 1) : index % 12);
    const status = paid
      ? PaymentStatus.PAID
      : overdue
        ? PaymentStatus.OVERDUE
        : PaymentStatus.PENDING;

    await prisma.payment.create({
      data: {
        academyId: academy.id,
        studentId: students[index % students.length].id,
        amount: [3500, 4500, 5000, 6500][index % 4],
        dueDate,
        paidDate: paid ? daysFromNow(-((index % 10) + 1)) : null,
        status,
        receiptNumber: paid ? `BPSA-${String(index + 1).padStart(4, "0")}` : null,
        notes: paid ? "Monthly fee collected." : "Monthly fee pending.",
        createdBy: owner.id,
        updatedBy: owner.id
      }
    });
  }

  const reminder = await prisma.message.create({
    data: {
      academyId: academy.id,
      type: MessageType.WHATSAPP,
      template: MessageTemplate.PAYMENT_REMINDER,
      body: "Hi {{guardianName}}, this is a reminder that the academy fee is due. Please ignore if already paid.",
      status: MessageStatus.RECORDED,
      createdBy: staff.id,
      updatedBy: staff.id
    }
  });

  await prisma.messageRecipient.create({
    data: {
      academyId: academy.id,
      messageId: reminder.id,
      studentId: students[0].id,
      phone: students[0].phone,
      email: students[0].email,
      recipientName: students[0].guardianName ?? students[0].fullName,
      createdBy: staff.id,
      updatedBy: staff.id
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
