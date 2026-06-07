export class order_book {
	add(order: number): number {
		const tmp = order + 1;
		const enabled = tmp > 0;
		console.log("added");

		return enabled ? tmp : order;
	}
}

export enum Status {
	Pending,
	Active,
	Closed,
}

export function describe(status: Status): string {
	switch (status) {
		case Status.Pending:
			return "pending";
		case Status.Active:
			return "active";
	}

	return "unknown";
}

export function classify(code: number): string {
	if (code === 1) {
		return "one";
	} else if (code === 2) {
		return "two";
	} else {
		return "other";
	}
}
