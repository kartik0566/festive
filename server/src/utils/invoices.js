import Invoice from "../models/Invoice.js";

const invoiceDueDate = (value) => value || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

export const nextInvoiceNumber = async () => {
  const count = await Invoice.countDocuments();
  return `FE-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
};

export const invoicePayloadFromProposal = async (proposal, options = {}) => ({
  invoiceNumber: await nextInvoiceNumber(),
  proposal: proposal._id,
  event: proposal.event,
  client: proposal.client,
  items: proposal.items,
  subtotal: proposal.subtotal,
  discount: proposal.discount,
  taxRate: proposal.taxRate,
  taxAmount: proposal.taxAmount,
  total: proposal.total,
  dueDate: invoiceDueDate(options.dueDate),
  notes: options.notes,
  status: "issued"
});

export const getOrCreateInvoiceFromProposal = async (proposal, options = {}) => {
  let invoice = await Invoice.findOne({ proposal: proposal._id });
  const alreadyIssued = Boolean(invoice);

  if (!invoice) {
    invoice = await Invoice.create(await invoicePayloadFromProposal(proposal, options));
  }

  return { invoice, alreadyIssued };
};
