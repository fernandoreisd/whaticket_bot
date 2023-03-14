const rules = {
	user: {
		static: [],
	},

	admin: {
		static: [
			"drawer-admin-items:view",
			"tickets-manager:showall",
			"tickets-manager:showalladmin",
			"user-modal:editProfile",
			"user-modal:editQueues",
			"ticket-options:deleteTicket",
			"contacts-page:deleteContact",
		],
	},

	superv: {
		static: [
			"drawer-superv-items:view",
			"tickets-manager:showall",
		],
	}
};

export default rules;
