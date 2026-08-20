import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ScheduleLeaderService } from '../../infrastructure/redis/schedule-leader.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { BookingService } from './booking.service';

/** S3-02 / BR-17 — auto release inventory lock when reservation expires */
@Injectable()
export class BookingExpiryJob {
  private readonly logger = new Logger(BookingExpiryJob.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    private readonly bookingService: BookingService,
    private readonly scheduleLeader: ScheduleLeaderService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredBookings(): Promise<void> {
    if (!(await this.scheduleLeader.isLeader('booking-expiry', 50))) return;
    const expired = await this.bookings.find({
      where: {
        status: 'RESERVED',
        expiresAt: LessThanOrEqual(new Date()),
      },
      take: 100,
    });

    if (expired.length === 0) return;

    for (const booking of expired) {
      await this.bookingService.expireBooking(booking);
      this.logger.log(
        `BR-17 expired booking ${booking.id} — unit ${booking.unitId} lock released`,
      );
    }
  }
}
