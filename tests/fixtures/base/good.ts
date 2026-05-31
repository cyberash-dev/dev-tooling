export interface Account {
	readonly id: string;
}

export class OrderBook {
	private readonly orders: number[] = [];

	add(order: number): void {
		this.orders.push(order);
		console.warn("order added");
	}
}

export function check(account: Account): boolean {
	const isActive = account.id.length > 0;
	const { id } = account;

	return isActive && id.length > 0;
}
