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

export enum Direction {
	Up,
	Down,
}

export function labelOf(direction: Direction): string {
	switch (direction) {
		case Direction.Up:
			return "up";
		case Direction.Down:
			return "down";
	}
}

export function pick(code: number): string {
	if (code === 1) {
		return "one";
	}

	return "other";
}
