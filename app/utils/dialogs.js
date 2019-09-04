const assistenteAPI = require('../chatbot_api');
const flow = require('./flow');
const attach = require('./attach');
const checkQR = require('./checkQR');
const help = require('./helper');

async function sendMainMenu(context, text) {
	const textToSend = text || flow.mainMenu.text1;
	await context.sendText(textToSend, await checkQR.buildMainMenu(context));
}

async function checkFullName(context) {
	if (/^[a-zA-Z\s]+$/.test(context.state.whatWasTyped)) {
		await context.setState({ titularNome: context.state.whatWasTyped, dialog: 'askTitularCPF' });
	} else {
		await context.sendText(flow.titularSim.askTitularNameFail);
		await context.setState({ dialog: 'invalidName' });
	}
}

async function checkCPF(context) {
	const cpf = await help.getCPFValid(context.state.whatWasTyped);

	if (cpf) {
		await context.setState({ titularCPF: cpf, dialog: 'askTitularPhone' });
	} else {
		await context.sendText(flow.titularSim.askTitularCPFFail);
		await context.setState({ dialog: 'invalidCPF' });
	}
}

async function checkPhone(context) {
	const phone = await help.getPhoneValid(context.state.whatWasTyped);

	if (phone) {
		await context.setState({ titularPhone: phone, dialog: 'askTitularMail' });
	} else {
		await context.sendText(flow.titularSim.askTitularPhoneFail);
		await context.setState({ dialog: 'invalidPhone' });
	}
}

async function checkEmail(context) {
	if (context.state.whatWasTyped.includes('@')) {
		await context.setState({ titularMail: context.state.whatWasTyped, dialog: 'gerarTicket' });
	} else {
		await context.sendText(flow.titularSim.askTitularMailFail);
		await context.setState({ dialog: 'invalidMail' });
	}
}

async function meuTicket(context) {
	await context.setState({ userTickets: await assistenteAPI.getuserTickets(context.session.user.id) });
	if (context.state.userTickets.itens_count > 0) {
		await attach.sendTicketCards(context, context.state.userTickets.tickets);
		await context.typing(1000 * 3);
	}
	await sendMainMenu(context);
}

async function atendimentoLGPD(context) {
	const options = await checkQR.buildAtendimento(context);
	if (!options) {
		await sendMainMenu(context);
	} else {
		await context.sendText(flow.atendimentoLGPD.text1, options);
	}
}

async function cancelTicket(context) {
	const res = await assistenteAPI.putStatusTicket(context.state.ticketID, 'canceled');
	if (res && res.id) {
		await context.sendText(flow.cancelConfirmation.cancelSuccess);
		await sendMainMenu(context);
	} else {
		await context.sendText(flow.cancelConfirmation.cancelFailure);
	}
}

async function seeTicketMessages(context) {
	await context.setState({ currentTicket: await context.state.userTickets.tickets.find((x) => x.id.toString() === context.state.ticketID) });
	const messages = context.state.currentTicket.message;
	await context.sendText('Mensagens do ticket:');
	for (let i = 0; i < messages.length; i++) {
		const element = messages[i];
		await context.sendText(element);
	}
	await sendMainMenu(context);
}

async function newTicketMessage(context) {
	const res = await assistenteAPI.putAddMsgTicket(context.state.currentTicket.id, context.state.ticketMsg);
	if (res && res.id) {
		await context.sendText(flow.leaveTMsg.cancelSuccess);
		await sendMainMenu(context);
	} else {
		await context.sendText(flow.leaveTMsg.cancelFailure);
	}
}

module.exports = {
	sendMainMenu, checkFullName, checkCPF, checkPhone, checkEmail, meuTicket, atendimentoLGPD, cancelTicket, seeTicketMessages, newTicketMessage,
};
