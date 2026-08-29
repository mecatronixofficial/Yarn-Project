import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class DashboardService {
  constructor(private prisma:PrismaService){}
  async get(){
    const [openOrders, productionOrders, notifications, machines, workers, stock, dispatches, waste] = await Promise.all([
      this.prisma.salesOrder.count({where:{status:{in:['CONFIRMED','PLANNING','IN_PRODUCTION','PARTIALLY_COMPLETED','READY','PARTIALLY_DELIVERED']}}}),
      this.prisma.productionOrder.findMany({where:{status:{notIn:['CLOSED','REJECTED']}},take:8,orderBy:{updatedAt:'desc'},include:{salesOrder:{include:{customer:true}},salesOrderItem:true}}),
      this.prisma.notification.count({where:{isRead:false}}),
      this.prisma.machine.groupBy({by:['status'],_count:true}),
      this.prisma.user.count({where:{role:'WORKER',status:'ACTIVE'}}),
      this.prisma.stockTransaction.groupBy({by:['category'],_sum:{quantityIn:true,quantityOut:true}}),
      this.prisma.dispatch.aggregate({where:{status:{in:['READY','DISPATCHED','IN_TRANSIT']}},_sum:{totalWeightKg:true}}),
      this.prisma.wasteEntry.aggregate({where:{createdAt:{gte:new Date(new Date().setHours(0,0,0,0))}},_sum:{quantityKg:true}}),
    ]);
    const stockBalance = Object.fromEntries(stock.map(s=>[s.category, Number(s._sum.quantityIn||0)-Number(s._sum.quantityOut||0)]));
    return {success:true,data:{
      kpis:{openOrders,workersActive:workers,unreadNotifications:notifications,pendingDispatchKg:Number(dispatches._sum.totalWeightKg||0),wasteTodayKg:Number(waste._sum.quantityKg||0),...stockBalance},
      machines:Object.fromEntries(machines.map(m=>[m.status,m._count])),
      activeProduction:productionOrders.map(p=>({id:p.id,productionNo:p.productionNo,orderNo:p.salesOrder.orderNo,customer:p.salesOrder.customer.name,fabric:p.salesOrderItem.fabricType,color:p.salesOrderItem.color,qtyKg:Number(p.plannedQtyKg),status:p.status}))
    }};
  }
}
