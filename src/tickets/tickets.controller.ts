import { Body, ConflictException, Controller, Get, HttpException, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';

interface newTicketDto {
  type: TicketType;
  companyId: number;
}

interface TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;
}

const MapTicketTypeToCategory: Record<TicketType, TicketCategory> = {
  [TicketType.managementReport]: TicketCategory.accounting,
  [TicketType.registrationAddressChange]: TicketCategory.corporate,
  [TicketType.strikeOff]: TicketCategory.management,
}

const MapTicketTypeToUserRole: Record<TicketType, UserRole> = {
  [TicketType.managementReport]: UserRole.accountant,
  [TicketType.registrationAddressChange]: UserRole.corporateSecretary,
  [TicketType.strikeOff]: UserRole.director,
}

@Controller('api/v1/tickets')
export class TicketsController {
  @Get()
  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  @Post()
  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;

    const companies = await Company.findAll({
      where: {
        id: companyId
      }
    })

    if (companies.length <= 0) {
      throw new ConflictException(
        `There is no company with this company id ${companyId}`
      )
    }

    const category = MapTicketTypeToCategory[type]
    const userRole = MapTicketTypeToUserRole[type]

    if (!category || !userRole) {
      throw new ConflictException(
        `There is no category and user role with this ticket type ${type}`
      )
    }

    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    if (!assignees.length)
      throw new ConflictException(
        `Cannot find user with role ${userRole} to create a ticket`,
      );

    if (userRole === UserRole.corporateSecretary && assignees.length > 1)
      throw new ConflictException(
        `Multiple users with role ${userRole}. Cannot create a ticket`,
      );

    let assignee = assignees[0];

    if (type === TicketType.registrationAddressChange) {
      const existTicket = await Ticket.findAll({
        where: {
          companyId: companyId,
          type: type
        }
      })
      if (existTicket.length === 1) {

        // assigned to director
        const assigneesDirector = await User.findAll({
          where: { companyId, role: UserRole.director },
          order: [['createdAt', 'DESC']],
        });

        if (!assignees.length)
          throw new ConflictException(
            `Cannot find user with role ${UserRole.director} to create a ticket, ${userRole} is already handling a ticket`,
          );

        if (assignees.length > 1)
          throw new ConflictException(
            `Multiple users with role ${UserRole.director}. Cannot create a ticket, ${userRole} is already handling a ticket`,
          );

        assignee = assigneesDirector[0]
      }

      if (existTicket.length >= 2) {
        throw new ConflictException("Company cannot take registrationAddressChange ticket anymore")
      }
    }

    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });

    const ticketDto: TicketDto = {
      id: ticket.id,
      type: ticket.type,
      assigneeId: ticket.assigneeId,
      status: ticket.status,
      category: ticket.category,
      companyId: ticket.companyId,
    };

    return ticketDto;
  }
}
