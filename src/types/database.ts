export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    name: string;
                    role: string;
                    receives_order_emails: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    name: string;
                    role?: string;
                    receives_order_emails?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string;
                    role?: string;
                    receives_order_emails?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            products: {
                Row: {
                    id: string;
                    name: string;
                    sku: string | null;
                    product_code: string | null;
                    jan_code: string | null;
                    weight: number | null;
                    shape: string | null;
                    material: string | null;
                    unit_price: number;
                    printing_cost: number;
                    category: string;
                    image_url: string | null;
                    description: string | null;
                    status: string;
                    min_stock_alert: number | null;
                    prefix: string | null;
                    origin: string | null;
                    variety: string | null;
                    suffix: string | null;
                    front_color_count: number | null;
                    back_color_count: number | null;
                    total_color_count: number | null;
                    product_type: string | null;
                    supplier_stock: number | null;
                    supplier_stock_updated_at: string | null;
                    status_override: string | null;
                    supplier_id: string | null;
                    discontinued_date: string | null;
                    meters_per_roll: number | null;
                    daily_shipment_rate: number | null;
                    production_lead_days: number | null;
                    old_unit_price: number | null;
                    old_printing_cost: number | null;
                    price_increase_effective_date: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    sku?: string | null;
                    product_code?: string | null;
                    jan_code?: string | null;
                    weight?: number | null;
                    shape?: string | null;
                    material?: string | null;
                    unit_price?: number;
                    printing_cost?: number;
                    category?: string;
                    image_url?: string | null;
                    description?: string | null;
                    status?: string;
                    min_stock_alert?: number | null;
                    prefix?: string | null;
                    origin?: string | null;
                    variety?: string | null;
                    suffix?: string | null;
                    front_color_count?: number | null;
                    back_color_count?: number | null;
                    total_color_count?: number | null;
                    product_type?: string | null;
                    supplier_stock?: number | null;
                    supplier_stock_updated_at?: string | null;
                    status_override?: string | null;
                    supplier_id?: string | null;
                    discontinued_date?: string | null;
                    meters_per_roll?: number | null;
                    daily_shipment_rate?: number | null;
                    production_lead_days?: number | null;
                    old_unit_price?: number | null;
                    old_printing_cost?: number | null;
                    price_increase_effective_date?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    sku?: string | null;
                    product_code?: string | null;
                    jan_code?: string | null;
                    weight?: number | null;
                    shape?: string | null;
                    material?: string | null;
                    unit_price?: number;
                    printing_cost?: number;
                    category?: string;
                    image_url?: string | null;
                    description?: string | null;
                    status?: string;
                    min_stock_alert?: number | null;
                    prefix?: string | null;
                    origin?: string | null;
                    variety?: string | null;
                    suffix?: string | null;
                    front_color_count?: number | null;
                    back_color_count?: number | null;
                    total_color_count?: number | null;
                    product_type?: string | null;
                    supplier_stock?: number | null;
                    supplier_stock_updated_at?: string | null;
                    status_override?: string | null;
                    supplier_id?: string | null;
                    discontinued_date?: string | null;
                    meters_per_roll?: number | null;
                    daily_shipment_rate?: number | null;
                    production_lead_days?: number | null;
                    old_unit_price?: number | null;
                    old_printing_cost?: number | null;
                    price_increase_effective_date?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            inventory: {
                Row: {
                    id: string;
                    product_id: string;
                    quantity: number;
                    old_price_quantity: number;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    product_id: string;
                    quantity?: number;
                    old_price_quantity?: number;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    product_id?: string;
                    quantity?: number;
                    old_price_quantity?: number;
                    updated_at?: string;
                };
                Relationships: [];
            };
            stock_history: {
                Row: {
                    id: string;
                    product_id: string;
                    user_id: string | null;
                    type: string;
                    quantity: number;
                    note: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    product_id: string;
                    user_id?: string | null;
                    type: string;
                    quantity: number;
                    note?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    product_id?: string;
                    user_id?: string | null;
                    type?: string;
                    quantity?: number;
                    note?: string | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            incoming_stock: {
                Row: {
                    id: string;
                    product_id: string;
                    expected_date: string | null;
                    shipped_date: string | null;
                    quantity: number;
                    note: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    product_id: string;
                    expected_date?: string | null;
                    shipped_date?: string | null;
                    quantity: number;
                    note?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    product_id?: string;
                    expected_date?: string | null;
                    shipped_date?: string | null;
                    quantity?: number;
                    note?: string | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            work_in_progress: {
                Row: {
                    id: string;
                    product_id: string;
                    quantity: number;
                    started_at: string;
                    expected_completion: string | null;
                    completed_at: string | null;
                    status: string;
                    confirmation_status: string | null;
                    term_type: string | null;
                    is_new_price: boolean | null;
                    note: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    product_id: string;
                    quantity: number;
                    started_at?: string;
                    expected_completion?: string | null;
                    completed_at?: string | null;
                    status?: string;
                    confirmation_status?: string | null;
                    term_type?: string | null;
                    is_new_price?: boolean | null;
                    note?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    product_id?: string;
                    quantity?: number;
                    started_at?: string;
                    expected_completion?: string | null;
                    completed_at?: string | null;
                    status?: string;
                    confirmation_status?: string | null;
                    term_type?: string | null;
                    is_new_price?: boolean | null;
                    note?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            supplier_stock_lots: {
                Row: {
                    id: string;
                    product_id: string;
                    stock_date: string;
                    quantity: number;
                    note: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    product_id: string;
                    stock_date?: string;
                    quantity?: number;
                    note?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    product_id?: string;
                    stock_date?: string;
                    quantity?: number;
                    note?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            suppliers: {
                Row: {
                    id: string;
                    name: string;
                    contact_person: string | null;
                    email: string | null;
                    phone: string | null;
                    address: string | null;
                    note: string | null;
                    active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    contact_person?: string | null;
                    email?: string | null;
                    phone?: string | null;
                    address?: string | null;
                    note?: string | null;
                    active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    contact_person?: string | null;
                    email?: string | null;
                    phone?: string | null;
                    address?: string | null;
                    note?: string | null;
                    active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            delivery_addresses: {
                Row: {
                    id: string;
                    client_id: string;
                    name: string;
                    postal_code: string | null;
                    address: string;
                    phone: string;
                    is_default: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    client_id: string;
                    name: string;
                    postal_code?: string | null;
                    address: string;
                    phone: string;
                    is_default?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    client_id?: string;
                    name?: string;
                    postal_code?: string | null;
                    address?: string;
                    phone?: string;
                    is_default?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            app_settings: {
                Row: {
                    key: string;
                    value: string;
                    updated_at: string;
                };
                Insert: {
                    key: string;
                    value: string;
                    updated_at?: string;
                };
                Update: {
                    key?: string;
                    value?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            price_revisions: {
                Row: {
                    id: string;
                    product_id: string;
                    unit_price: number;
                    printing_cost: number;
                    effective_date: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    product_id: string;
                    unit_price: number;
                    printing_cost: number;
                    effective_date: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    product_id?: string;
                    unit_price?: number;
                    printing_cost?: number;
                    effective_date?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "price_revisions_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["id"];
                    }
                ];
            };

            orders: {
                Row: {
                    id: string;
                    client_id: string;
                    status: string;
                    type: string;
                    event_id: string | null;
                    shipment_source: string;
                    delivery_name: string | null;
                    delivery_postal_code: string | null;
                    delivery_address: string | null;
                    delivery_phone: string | null;
                    preferred_shape: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    client_id: string;
                    status?: string;
                    type?: string;
                    event_id?: string | null;
                    shipment_source?: string;
                    delivery_name?: string | null;
                    delivery_postal_code?: string | null;
                    delivery_address?: string | null;
                    delivery_phone?: string | null;
                    preferred_shape?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    client_id?: string;
                    status?: string;
                    type?: string;
                    event_id?: string | null;
                    shipment_source?: string;
                    delivery_name?: string | null;
                    delivery_postal_code?: string | null;
                    delivery_address?: string | null;
                    delivery_phone?: string | null;
                    preferred_shape?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    product_id: string;
                    quantity: number;
                    unit_price: number;
                    printing_cost: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    product_id: string;
                    quantity: number;
                    unit_price?: number;
                    printing_cost?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    product_id?: string;
                    quantity?: number;
                    unit_price?: number;
                    printing_cost?: number;
                    created_at?: string;
                };
                Relationships: [];
            };
            error_logs: {
                Row: {
                    id: string;
                    route: string;
                    method: string;
                    error_message: string;
                    stack_trace: string | null;
                    user_id: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    route: string;
                    method: string;
                    error_message: string;
                    stack_trace?: string | null;
                    user_id?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    route?: string;
                    method?: string;
                    error_message?: string;
                    stack_trace?: string | null;
                    user_id?: string | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            activity_logs: {
                Row: {
                    id: string;
                    user_id: string | null;
                    action: string;
                    details: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    action: string;
                    details?: Json | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    action?: string;
                    details?: Json | null;
                    created_at?: string;
                };
                Relationships: [];
            };
            special_events: {
                Row: {
                    id: string;
                    client_id: string | null;
                    name: string;
                    start_date: string;
                    end_date: string;
                    status: string;
                    description: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    client_id?: string | null;
                    name: string;
                    start_date: string;
                    end_date: string;
                    status?: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    client_id?: string | null;
                    name?: string;
                    start_date?: string;
                    end_date?: string;
                    status?: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            sale_events: {
                Row: {
                    id: string;
                    client_name: string;
                    schedule_type: string;
                    dates: string[];
                    status: string;
                    description: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    client_name: string;
                    schedule_type?: string;
                    dates?: string[];
                    status?: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    client_name?: string;
                    schedule_type?: string;
                    dates?: string[];
                    status?: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            sale_event_items: {
                Row: {
                    id: string;
                    event_id: string;
                    product_id: string;
                    planned_quantity: number;
                    allocated_quantity: number;
                    actual_quantity: number | null;
                    is_produced: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    event_id: string;
                    product_id: string;
                    planned_quantity?: number;
                    allocated_quantity?: number;
                    actual_quantity?: number | null;
                    is_produced?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    event_id?: string;
                    product_id?: string;
                    planned_quantity?: number;
                    allocated_quantity?: number;
                    actual_quantity?: number | null;
                    is_produced?: boolean;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "sale_event_items_event_id_fkey";
                        columns: ["event_id"];
                        isOneToOne: false;
                        referencedRelation: "sale_events";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sale_event_items_product_id_fkey";
                        columns: ["product_id"];
                        isOneToOne: false;
                        referencedRelation: "products";
                        referencedColumns: ["id"];
                    }
                ];
            };


            sale_event_dates: {
                Row: {
                    id: string;
                    event_id: string;
                    date: string;
                };
                Insert: {
                    id?: string;
                    event_id: string;
                    date: string;
                };
                Update: {
                    id?: string;
                    event_id?: string;
                    date?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            update_inventory_atomic: {
                Args: {
                    p_product_id: string;
                    p_quantity: number;
                    p_type: string;
                    p_note?: string | null;
                    p_user_id?: string | null;
                };
                Returns: {
                    product_id: string;
                    quantity: number;
                    old_price_quantity: number;
                    updated_at: string;
                };
            };
            create_order_atomic: {
                Args: {
                    p_client_id: string;
                    p_type: string;
                    p_event_id?: string | null;
                    p_shipment_source?: string;
                    p_delivery_name?: string | null;
                    p_delivery_postal_code?: string | null;
                    p_delivery_address?: string | null;
                    p_delivery_phone?: string | null;
                    p_preferred_shape?: string | null;
                    p_items?: Json;
                };
                Returns: {
                    id: string;
                    clientId: string;
                    createdAt: string;
                    status: string;
                    type: string;
                    eventId: string | null;
                    shipmentSource: string;
                    deliveryName: string | null;
                    deliveryPostalCode: string | null;
                    deliveryAddress: string | null;
                    deliveryPhone: string | null;
                    preferredShape: string | null;
                };
            };
            move_supplier_stock_to_incoming_atomic: {
                Args: {
                    p_product_id: string;
                    p_schedules: Json;
                };
                Returns: {
                    success: boolean;
                    movedQuantity: number;
                };
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
}
