export type ServiceCategory = 'servicios' | 'terminales' | 'balanzas' | 'otros';

export interface Service {
    id?: number;
    name: string;
    host: string;
    type: 'ip' | 'url';
    category: ServiceCategory;
    terminal_id?: number;
    description?: string;
    is_active?: boolean;
    created_by?: number;
    updated_by?: number;
    created_at?: Date;
    updated_at?: Date;

    // Campos adicionales para vista
    branch_name?: string;
    last_status?: number;
    last_response_time?: number;
    last_checked_at?: Date;
}

export interface ServiceCheck {
    id?: number;
    service_id: number;
    is_alive: boolean;
    response_time?: number;
    packet_loss?: string;
    min_time?: number;
    max_time?: number;
    avg_time?: number;
    error_message?: string;
    checked_at?: Date;
}

export interface PingResult {
    alive: boolean;
    time?: number;
    packetLoss?: string;
    min?: number;
    max?: number;
    avg?: number;
    host: string;
    numeric_host?: string;
}
