"use client";

import * as React from "react";

interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
  totalSpent: number;
  orderCount: number;
  lastOrder: string;
}

export default function AdminUsersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/crm");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
        <p className="text-muted-foreground">360° customer profiles</p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <p className="text-sm text-muted-foreground">
            {customers.length} customers
          </p>
        </div>

        <div className="divide-y">
          {customers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No customers yet. Orders will appear here.
            </div>
          ) : (
            customers.map((customer) => (
              <div key={customer.email} className="p-4 hover:bg-accent/50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${customer.totalSpent.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.orderCount} order{customer.orderCount !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last: {new Date(customer.lastOrder).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {customer.address}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
