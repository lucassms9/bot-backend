import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { Event, CreateEventDto } from '../interfaces/event.interface';
import { Logger } from '../../../utils/logger';

@Injectable()
export class EventsRepository {
  private readonly logger = new Logger(EventsRepository.name);
  private readonly tableName = 'events';

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Find event by event_id
   */
  async findByEventId(eventId: string): Promise<Event | null> {
    this.logger.logDB('EventsRepository', 'SELECT', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      this.logger.logError('EventsRepository', 'Error finding event', error);
      throw error;
    }

    return data;
  }

  /**
   * Create new event
   */
  async create(eventDto: CreateEventDto): Promise<Event> {
    this.logger.logDB('EventsRepository', 'INSERT', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .insert([eventDto])
      .select()
      .single();

    if (error) {
      this.logger.logError(
        'EventsRepository',
        `Error creating event: ${error.message} [Code: ${error.code}]`,
        error,
      );
      throw new Error(
        `Failed to create event in Supabase: ${error.message} (Code: ${error.code})`,
      );
    }

    this.logger.logSuccess('EventsRepository', `Event created: ${eventDto.event_id}`);
    return data;
  }

  /**
   * Find or create event
   */
  async findOrCreate(eventDto: CreateEventDto): Promise<Event> {
    const existing = await this.findByEventId(eventDto.event_id);

    if (existing) {
      return existing;
    }

    return this.create(eventDto);
  }

  /**
   * Get events by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    this.logger.logDB('EventsRepository', 'SELECT', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .gte('commence_time', startDate.toISOString())
      .lte('commence_time', endDate.toISOString())
      .order('commence_time', { ascending: true });

    if (error) {
      this.logger.logError('EventsRepository', 'Error finding events by date', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all events
   */
  async findAll(): Promise<Event[]> {
    this.logger.logDB('EventsRepository', 'SELECT ALL', this.tableName);

    const { data, error } = await this.supabaseService
      .getClient()
      .from(this.tableName)
      .select('*')
      .order('commence_time', { ascending: true });

    if (error) {
      this.logger.logError('EventsRepository', 'Error finding all events', error);
      throw error;
    }

    return data || [];
  }
}
