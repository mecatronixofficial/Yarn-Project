import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.packingListItem.deleteMany();
  await prisma.packingList.deleteMany();
  await prisma.finishedFabricRoll.deleteMany();
  await prisma.qualityInspection.deleteMany();
  await prisma.finishingJob.deleteMany();
  await prisma.dyeingEntry.deleteMany();
  await prisma.dyeingBatchRoll.deleteMany();
  await prisma.dyeingBatch.deleteMany();
  await prisma.dyeRecipeItem.deleteMany();
  await prisma.dyeRecipe.deleteMany();
  await prisma.chemical.deleteMany();
  await prisma.greyFabricRoll.deleteMany();
  await prisma.knittingProductionEntry.deleteMany();
  await prisma.knittingJob.deleteMany();
  await prisma.yarnProductionEntry.deleteMany();
  await prisma.yarnStockLot.deleteMany();
  await prisma.wasteEntry.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.purchaseReceiptItem.deleteMany();
  await prisma.purchaseReceipt.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplierPayment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.systemSetting.deleteMany();

  const [rm, yarnWh, greyWh, fgWh] = await Promise.all([
    prisma.warehouse.create({ data: { code: 'WH-RM', name: 'Raw Material Warehouse' } }),
    prisma.warehouse.create({ data: { code: 'WH-YARN', name: 'Yarn Warehouse' } }),
    prisma.warehouse.create({ data: { code: 'WH-GREY', name: 'Grey Fabric Warehouse' } }),
    prisma.warehouse.create({ data: { code: 'WH-FG', name: 'Finished Goods Warehouse' } }),
  ]);

  const managerEmp = await prisma.employee.create({ data: { code: 'EMP-001', name: 'Arun Manager', department: 'Production', shift: 'General' } });
  const workerEmp = await prisma.employee.create({ data: { code: 'EMP-002', name: 'Kumar Worker', department: 'Knitting', shift: 'A' } });
  const dyeWorkerEmp = await prisma.employee.create({ data: { code: 'EMP-003', name: 'Ravi Dyeing', department: 'Dyeing', shift: 'A' } });
  const passwordHash = await argon2.hash(process.env.DEMO_PASSWORD || 'Demo@12345');

  const admin = await prisma.user.create({ data: { name: 'Super Admin', email: 'admin@example.com', passwordHash, role: 'SUPERADMIN' } });
  const manager = await prisma.user.create({ data: { name: 'Arun Manager', email: 'manager@example.com', passwordHash, role: 'MANAGER', employeeId: managerEmp.id } });
  const worker = await prisma.user.create({ data: { name: 'Kumar Worker', email: 'worker@example.com', passwordHash, role: 'WORKER', employeeId: workerEmp.id } });
  const dyeWorker = await prisma.user.create({ data: { name: 'Ravi Dyeing', email: 'dye@example.com', passwordHash, role: 'WORKER', employeeId: dyeWorkerEmp.id } });

  const customer = await prisma.customer.create({ data: { code: 'CUS-00001', name: 'Sri Textiles', company: 'Sri Textiles Pvt Ltd', contactPerson: 'Suresh', mobile: '9000000001', email: 'sri@example.com', state: 'Tamil Nadu', city: 'Tiruppur', creditLimit: 2500000, paymentTerms: '30 Days' } });
  await prisma.customer.createMany({ data: [
    { code: 'CUS-00002', name: 'Royal Garments', company: 'Royal Garments', city: 'Tiruppur' },
    { code: 'CUS-00003', name: 'JK Fashions', company: 'JK Fashions', city: 'Erode' },
    { code: 'CUS-00004', name: 'Kaveri Knitwear', company: 'Kaveri Knitwear', city: 'Coimbatore' },
  ]});
  await prisma.supplier.createMany({ data: [
    { code: 'SUP-00001', name: 'Cotton Source India', company: 'Cotton Source India', materialCategory: 'Cotton' },
    { code: 'SUP-00002', name: 'ColorChem', company: 'ColorChem Pvt Ltd', materialCategory: 'Dyes & Chemicals' },
  ]});

  const knittingMachine = await prisma.machine.create({ data: { code: 'KN-04', name: 'Circular Knitting 04', department: 'Knitting', capacityKg: 900, status: 'RUNNING', operatorId: workerEmp.id } });
  const dyeMachine = await prisma.machine.create({ data: { code: 'DYE-03', name: 'Soft Flow Dyeing 03', department: 'Dyeing', capacityKg: 1200, status: 'RUNNING', operatorId: dyeWorkerEmp.id } });
  await prisma.machine.createMany({ data: [
    { code: 'SP-01', name: 'Ring Spinning 01', department: 'Yarn', capacityKg: 1500, status: 'RUNNING' },
    { code: 'ST-01', name: 'Stenter 01', department: 'Finishing', capacityKg: 1800, status: 'IDLE' },
    { code: 'CP-01', name: 'Compactor 01', department: 'Finishing', capacityKg: 1600, status: 'IDLE' },
  ]});

  await prisma.stockTransaction.create({ data: { category: 'RAW_MATERIAL', txnType: 'OPENING', itemCode: 'COTTON-30S', itemName: 'Cotton for 30s Yarn', warehouseId: rm.id, quantityIn: 50000, referenceType: 'OPENING', referenceId: 'OPEN-RM-01', createdById: admin.id } });

  const order = await prisma.salesOrder.create({
    data: {
      orderNo: 'SO-2026-000001', customerId: customer.id, poNumber: 'PO-SRI-8841', status: 'PARTIALLY_DELIVERED', expectedDelivery: new Date('2026-09-05T00:00:00+05:30'),
      items: { create: [{ fabricType: 'Single Jersey', yarnType: 'Combed Cotton', yarnCount: '30s', color: 'Navy Blue', gsm: 180, diameter: '34 inch', width: '72 inch', quantityKg: 10000, rate: 385, amount: 3850000 }] },
    }, include: { items: true }
  });
  const item = order.items[0];
  const po = await prisma.productionOrder.create({ data: { productionNo: 'PO-2026-000001', salesOrderId: order.id, salesOrderItemId: item.id, plannedQtyKg: 10000, requiredYarnKg: 10800, expectedKnittingLossPct: 2, expectedDyeingLossPct: 3, priority: 'HIGH', status: 'COMPLETED', startDate: new Date('2026-08-24T00:00:00+05:30'), dueDate: new Date('2026-09-03T00:00:00+05:30') } });

  const yarnEntry = await prisma.yarnProductionEntry.create({ data: { entryNo: 'YN-2026-000001', productionOrderId: po.id, processName: 'Spinning + Auto Coner', lotNo: 'YL-30S-0826-01', yarnCount: '30s', machineCode: 'SP-01', shift: 'A', workerId: manager.id, inputKg: 11200, outputKg: 10800, wasteKg: 400, balanceKg: 0, approved: true } });
  await prisma.yarnStockLot.create({ data: { lotNo: 'YL-30S-0826-01', yarnType: 'Combed Cotton', yarnCount: '30s', color: 'Natural', coneCount: 2160, netWeightKg: 10800, warehouseCode: yarnWh.code } });
  await prisma.stockTransaction.create({ data: { category: 'YARN', txnType: 'PRODUCTION_IN', itemCode: '30s', itemName: 'Yarn 30s', lotNo: 'YL-30S-0826-01', warehouseId: yarnWh.id, quantityIn: 10800, referenceType: 'YARN_PRODUCTION', referenceId: yarnEntry.id, productionOrderId: po.id, createdById: manager.id } });
  await prisma.wasteEntry.create({ data: { productionOrderId: po.id, process: 'Yarn Production', quantityKg: 400, reason: 'Spinning process waste', machineCode: 'SP-01', workerName: manager.name, approvedBy: manager.name } });

  const knit = await prisma.knittingJob.create({ data: { jobNo: 'KN-2026-000001', productionOrderId: po.id, yarnLotNo: 'YL-30S-0826-01', yarnCount: '30s', fabricType: 'Single Jersey', gsm: 180, diameter: '34 inch', gauge: '24G', machineId: knittingMachine.id, assignedWorkerId: worker.id, yarnIssuedKg: 10800, status: 'COMPLETED' } });
  await prisma.stockTransaction.create({ data: { category: 'YARN', txnType: 'KNITTING_ISSUE', itemCode: '30s', itemName: 'Yarn 30s', lotNo: 'YL-30S-0826-01', warehouseId: yarnWh.id, quantityOut: 10800, referenceType: 'KNITTING_JOB', referenceId: knit.id, productionOrderId: po.id, createdById: manager.id } });
  const knitEntry = await prisma.knittingProductionEntry.create({ data: { knittingJobId: knit.id, workerId: worker.id, shift: 'A', outputKg: 10350, wasteKg: 250, balanceKg: 200, approved: true, notes: '200 KG remains as recoverable cones / process balance' } });
  const greyRoll = await prisma.greyFabricRoll.create({ data: { rollNo: 'GR-2026-000001', knittingJobId: knit.id, fabricType: 'Single Jersey', gsm: 180, diameter: '34 inch', width: '72 inch', weightKg: 10350, qcStatus: 'PASSED', warehouseCode: greyWh.code } });
  await prisma.stockTransaction.create({ data: { category: 'GREY_FABRIC', txnType: 'GREY_FABRIC_IN', itemCode: 'GREY:Single Jersey', itemName: 'Grey Single Jersey', lotNo: greyRoll.rollNo, warehouseId: greyWh.id, quantityIn: 10350, referenceType: 'KNITTING_ENTRY', referenceId: knitEntry.id, productionOrderId: po.id, createdById: manager.id } });
  await prisma.wasteEntry.create({ data: { productionOrderId: po.id, process: 'Knitting', quantityKg: 250, reason: 'Knitting waste', machineCode: knittingMachine.code, workerName: worker.name, approvedBy: manager.name } });

  const chem = await prisma.chemical.create({ data: { code: 'DYE-NAVY-01', name: 'Reactive Navy Dye', unit: 'KG', minStock: 50 } });
  const recipe = await prisma.dyeRecipe.create({ data: { name: 'Navy SJ Standard', color: 'Navy Blue', shade: 'NB-01', fabricType: 'Single Jersey', items: { create: [{ chemicalId: chem.id, qtyPerKg: 0.025, unit: 'KG' }] } } });
  const dye = await prisma.dyeingBatch.create({ data: { batchNo: 'DY-2026-000001', productionOrderId: po.id, color: 'Navy Blue', shade: 'NB-01', plannedQtyKg: 10350, machineId: dyeMachine.id, recipeId: recipe.id, assignedWorkerId: dyeWorker.id, status: 'COMPLETED', rolls: { create: [{ greyRollId: greyRoll.id, inputKg: 10350 }] } } });
  await prisma.stockTransaction.create({ data: { category: 'GREY_FABRIC', txnType: 'DYEING_ISSUE', itemCode: 'GREY:Single Jersey', itemName: 'Grey Single Jersey', lotNo: greyRoll.rollNo, warehouseId: greyWh.id, quantityOut: 10350, referenceType: 'DYEING_BATCH', referenceId: dye.id, productionOrderId: po.id, createdById: manager.id } });
  await prisma.dyeingEntry.create({ data: { batchId: dye.id, workerId: dyeWorker.id, processName: 'Scouring → Dyeing → Washing → Hydro → Drying', inputKg: 10350, outputKg: 10000, lossKg: 300, rejectedKg: 0, balanceKg: 50, temperature: 60, durationMin: 420, approved: true } });
  await prisma.wasteEntry.create({ data: { productionOrderId: po.id, process: 'Dyeing', quantityKg: 300, reason: 'Dyeing process loss', machineCode: dyeMachine.code, workerName: dyeWorker.name, approvedBy: manager.name } });

  await prisma.finishingJob.create({ data: { jobNo: 'FN-2026-000001', productionOrderId: po.id, processName: 'Stenter + Compacting', inputKg: 10000, outputKg: 9970, lossKg: 30, gsmBefore: 176, gsmAfter: 180, widthBefore: '75 inch', widthAfter: '72 inch', status: 'COMPLETED' } });
  const qc = await prisma.qualityInspection.create({ data: { inspectionNo: 'QC-2026-000001', productionOrderId: po.id, stage: 'FINAL', status: 'PASSED', inputKg: 9970, approvedKg: 9950, rejectedKg: 20, reworkKg: 0, inspectorId: manager.id, measurements: { gsm: 180, width: '72 inch', shrinkage: '3.2%', shade: 'PASS', colorFastness: '4/5' }, notes: 'Approved for packing' } });
  const rollA = await prisma.finishedFabricRoll.create({ data: { rollNo: 'FR-2026-000001-A', productionOrderId: po.id, color: 'Navy Blue', shade: 'NB-01', gsm: 180, width: '72 inch', netWeightKg: 8000, qcStatus: 'PASSED', warehouseCode: fgWh.code } });
  const rollB = await prisma.finishedFabricRoll.create({ data: { rollNo: 'FR-2026-000001-B', productionOrderId: po.id, color: 'Navy Blue', shade: 'NB-01', gsm: 180, width: '72 inch', netWeightKg: 1950, qcStatus: 'PASSED', warehouseCode: fgWh.code } });
  for (const r of [rollA, rollB]) await prisma.stockTransaction.create({ data: { category: 'FINISHED_FABRIC', txnType: 'QC_APPROVED', itemCode: 'FIN:Single Jersey:Navy Blue', itemName: 'Single Jersey Navy Blue', lotNo: r.rollNo, warehouseId: fgWh.id, quantityIn: r.netWeightKg, referenceType: 'QUALITY_INSPECTION', referenceId: qc.id, productionOrderId: po.id, createdById: manager.id } });
  await prisma.wasteEntry.create({ data: { productionOrderId: po.id, process: 'Final QC', quantityKg: 20, reason: 'QC rejection', workerName: manager.name, approvedBy: manager.name } });

  const pack = await prisma.packingList.create({ data: { packingNo: 'PK-2026-000001', salesOrderId: order.id, packingType: 'Roll / Poly Pack', netWeightKg: 8000, grossWeightKg: 8032, status: 'DISPATCHED', items: { create: [{ rollId: rollA.id, weightKg: 8000 }] } } });
  const invoice = await prisma.invoice.create({ data: { invoiceNo: 'INV-2026-000001', customerId: customer.id, salesOrderId: order.id, taxableValue: 3080000, gstAmount: 369600, totalAmount: 3449600, dueDate: new Date('2026-09-28T00:00:00+05:30'), status: 'PARTIALLY_PAID' } });
  const dispatch = await prisma.dispatch.create({ data: { dispatchNo: 'DSP-2026-000001', salesOrderId: order.id, packingListId: pack.id, invoiceId: invoice.id, dispatchDate: new Date('2026-08-28T14:00:00+05:30'), vehicle: 'TN 39 AB 2345', driver: 'Murugan', transporter: 'Kongu Transport', lrNumber: 'LR-48211', totalWeightKg: 8000, status: 'DELIVERED' } });
  await prisma.stockTransaction.create({ data: { category: 'FINISHED_FABRIC', txnType: 'DISPATCH_OUT', itemCode: 'FIN:Single Jersey:Navy Blue', itemName: 'Single Jersey Navy Blue', lotNo: rollA.rollNo, warehouseId: fgWh.id, quantityOut: 8000, referenceType: 'DISPATCH', referenceId: dispatch.id, productionOrderId: po.id, createdById: manager.id } });
  await prisma.delivery.create({ data: { deliveryNo: 'DLV-2026-000001', dispatchId: dispatch.id, receivedKg: 8000, shortageKg: 0, damagedKg: 0, returnedKg: 0, deliveryDate: new Date('2026-08-29T09:30:00+05:30'), notes: 'Customer received material' } });
  await prisma.customerPayment.create({ data: { customerId: customer.id, invoiceId: invoice.id, amount: 1500000, mode: 'RTGS', referenceNo: 'UTR-DEMO-4821', bank: 'Demo Bank', notes: 'Part payment' } });

  await prisma.notification.createMany({ data: [
    { userId: manager.id, title: 'Delivery balance pending', message: 'SO-2026-000001 has 1,950 KG finished stock ready for next dispatch; 50 KG production shortfall remains.', type: 'DELIVERY_DUE', priority: 'HIGH', referenceType: 'SALES_ORDER', referenceId: order.id },
    { userId: worker.id, title: 'Knitting job completed', message: 'KN-2026-000001 output 10,350 KG approved.', type: 'JOB_COMPLETED', referenceType: 'KNITTING_JOB', referenceId: knit.id },
    { userId: admin.id, title: 'Demo ERP ready', message: 'Seeded traceable order SO-2026-000001 from yarn to delivery.', type: 'SYSTEM', priority: 'NORMAL' },
  ]});

  await prisma.expense.createMany({ data: [
    { expenseNo: 'EXP-2026-000001', category: 'Electricity', description: 'Production power allocation', amount: 185000, paymentMode: 'Bank', branch: 'Main Factory' },
    { expenseNo: 'EXP-2026-000002', category: 'Transport', description: 'Dispatch freight', amount: 28000, paymentMode: 'Bank', branch: 'Main Factory' },
  ]});

  await prisma.systemSetting.createMany({ data: [
    { key: 'company', value: { name: 'YarnFlow Textile ERP Demo', currency: 'INR', timezone: 'Asia/Kolkata', gst: '33ABCDE1234F1Z5' } },
    { key: 'tolerances', value: { yarnBalanceKg: 5, knittingWastePct: 3, dyeingLossPct: 4 } },
  ]});

  console.log('Seed complete');
  console.log('Demo password:', process.env.DEMO_PASSWORD || 'Demo@12345');
  console.log('Super Admin: admin@example.com');
  console.log('Manager: manager@example.com');
  console.log('Worker: worker@example.com');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
