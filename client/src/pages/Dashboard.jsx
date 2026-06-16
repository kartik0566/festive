import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  BadgeIndianRupee,
  CalendarDays,
  Check,
  Download,
  FileText,
  Handshake,
  IndianRupee,
  Plus,
  RefreshCcw,
  Send,
  Star,
  UsersRound
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, formatCurrency, formatDate, getErrorMessage, loadRazorpay } from "../api/client.js";
import EmptyState from "../components/EmptyState.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const eventStatuses = ["new", "reviewing", "proposal_sent", "confirmed", "in_progress", "completed", "cancelled"];
const assignmentStatuses = ["assigned", "accepted", "in_progress", "completed", "cancelled"];

const emptyEventForm = {
  eventType: "Wedding",
  eventDate: "",
  budget: "",
  guestCount: "",
  location: "",
  message: ""
};

const emptyProposalForm = {
  event: "",
  title: "",
  summary: "",
  itemName: "Event planning package",
  itemDescription: "",
  quantity: 1,
  unitPrice: "",
  discount: 0,
  taxRate: 18,
  terms: "50% advance to confirm booking. Balance due before the event date."
};

const emptyVendorForm = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  serviceCategory: "",
  notes: ""
};

const emptyAssignmentForm = {
  event: "",
  vendor: "",
  service: "",
  quoteAmount: "",
  dueDate: "",
  notes: ""
};

const emptyUserForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "staff",
  companyName: "",
  serviceCategory: ""
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [proposalForm, setProposalForm] = useState(emptyProposalForm);
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [reviewForm, setReviewForm] = useState({ event: "", rating: 5, comment: "" });
  const [userForm, setUserForm] = useState(emptyUserForm);

  const isAdmin = user.role === "admin";
  const isStaff = user.role === "staff";
  const isClient = user.role === "client";
  const isVendor = user.role === "vendor";
  const canManage = isAdmin || isStaff;

  const tabs = useMemo(() => {
    if (isVendor) {
      return ["overview", "assignments"];
    }

    if (isClient) {
      return ["overview", "events", "proposals", "invoices", "reviews"];
    }

    return ["overview", "calendar", "events", "proposals", "invoices", "vendors", "reviews", ...(isAdmin ? ["users"] : [])];
  }, [isAdmin, isClient, isVendor]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const requests = [
        apiClient.get("/dashboard/overview"),
        apiClient.get("/events"),
        apiClient.get("/proposals"),
        apiClient.get("/invoices")
      ];

      if (canManage || isVendor) {
        requests.push(apiClient.get("/vendors/assignments"));
      }

      if (canManage) {
        requests.push(apiClient.get("/vendors"));
        requests.push(apiClient.get("/reviews/manage"));
      }

      if (isAdmin) {
        requests.push(apiClient.get("/auth/users"));
      }

      const results = await Promise.all(requests);
      setOverview(results[0].data);
      setEvents(results[1].data);
      setProposals(results[2].data);
      setInvoices(results[3].data);

      let cursor = 4;
      if (canManage || isVendor) {
        setAssignments(results[cursor].data);
        cursor += 1;
      }

      if (canManage) {
        setVendors(results[cursor].data);
        setReviews(results[cursor + 1].data);
        cursor += 2;
      }

      if (isAdmin) {
        setUsers(results[cursor].data);
      }
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [canManage, isAdmin, isVendor]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const flash = (type, text) => setMessage({ type, text });

  const updateObject = (setter) => (event) => {
    setter((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const createEvent = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post("/events", {
        ...eventForm,
        guestCount: Number(eventForm.guestCount || 0)
      });
      setEventForm(emptyEventForm);
      flash("success", "Event request created.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const updateEventStatus = async (eventId, status) => {
    try {
      await apiClient.patch(`/events/${eventId}`, { status });
      flash("success", "Event status updated.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const createProposal = async (event) => {
    event.preventDefault();

    try {
      await apiClient.post("/proposals", {
        event: proposalForm.event,
        title: proposalForm.title,
        summary: proposalForm.summary,
        items: [
          {
            name: proposalForm.itemName,
            description: proposalForm.itemDescription,
            quantity: Number(proposalForm.quantity || 1),
            unitPrice: Number(proposalForm.unitPrice || 0)
          }
        ],
        discount: Number(proposalForm.discount || 0),
        taxRate: Number(proposalForm.taxRate || 18),
        terms: proposalForm.terms
      });
      setProposalForm(emptyProposalForm);
      flash("success", "Proposal generated and sent.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const approveProposal = async (proposalId) => {
    try {
      await apiClient.patch(`/proposals/${proposalId}/approve`);
      flash("success", "Proposal approved and invoice generated.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const rejectProposal = async (proposalId) => {
    try {
      await apiClient.patch(`/proposals/${proposalId}/reject`);
      flash("success", "Proposal rejected.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const downloadInvoice = async (invoice) => {
    try {
      const response = await apiClient.get(`/invoices/${invoice._id}/pdf`, { responseType: "blob" });
      downloadBlob(response.data, `${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const payInvoice = async (invoice) => {
    try {
      const balance = Math.max(invoice.total - invoice.amountPaid, 0);
      const { data: order } = await apiClient.post("/payments/create-order", {
        invoiceId: invoice._id,
        amount: balance
      });

      if (order.provider === "demo") {
        await apiClient.post("/payments/verify", {
          invoiceId: invoice._id,
          paymentId: order.paymentId
        });
        flash("success", "Demo payment completed.");
        loadDashboard();
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        flash("error", "Could not load Razorpay checkout.");
        return;
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "Festive Events",
        description: invoice.invoiceNumber,
        order_id: order.orderId,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        handler: async (response) => {
          await apiClient.post("/payments/verify", {
            ...response,
            invoiceId: invoice._id,
            paymentId: order.paymentId
          });
          flash("success", "Payment verified.");
          loadDashboard();
        }
      });

      checkout.open();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const createVendor = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post("/vendors", vendorForm);
      setVendorForm(emptyVendorForm);
      flash("success", "Vendor added.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const createAssignment = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post("/vendors/assignments", {
        ...assignmentForm,
        quoteAmount: Number(assignmentForm.quoteAmount || 0)
      });
      setAssignmentForm(emptyAssignmentForm);
      flash("success", "Vendor assigned to event.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const updateAssignmentStatus = async (assignmentId, status) => {
    try {
      await apiClient.patch(`/vendors/assignments/${assignmentId}`, { status });
      flash("success", "Assignment updated.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post("/reviews", reviewForm);
      setReviewForm({ event: "", rating: 5, comment: "" });
      flash("success", "Review submitted for approval.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const updateReview = async (reviewId, payload) => {
    try {
      await apiClient.patch(`/reviews/${reviewId}`, payload);
      flash("success", "Review updated.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post("/auth/users", userForm);
      setUserForm(emptyUserForm);
      flash("success", "User created.");
      loadDashboard();
    } catch (error) {
      flash("error", getErrorMessage(error));
    }
  };

  const calendarEvents = events.map((item) => ({
    id: item._id,
    title: `${item.eventType} - ${item.name}`,
    start: item.eventDate,
    className: `calendar-${item.status}`
  }));

  const stats = overview?.stats || {};

  return (
    <main className="dashboard-page">
      <section className="dashboard-shell">
        <aside className="sidebar">
          <div>
            <span className="eyebrow">Workspace</span>
            <h1>{user.role} dashboard</h1>
            <p>{user.name}</p>
          </div>
          <div className="tab-list">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? "tab-button active" : "tab-button"}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </aside>

        <section className="workspace">
          <div className="workspace-header">
            <div>
              <span className="eyebrow">MERN event platform</span>
              <h2>{activeTab}</h2>
            </div>
            <button className="button ghost compact" onClick={loadDashboard}>
              <RefreshCcw size={18} />
              Refresh
            </button>
          </div>

          {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}
          {loading ? <div className="loader" /> : null}

          {!loading && activeTab === "overview" && (
            <Overview
              stats={stats}
              isClient={isClient}
              isVendor={isVendor}
              events={events}
              assignments={assignments}
              invoices={invoices}
            />
          )}

          {!loading && activeTab === "calendar" && (
            <section className="tool-panel">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={calendarEvents}
                height="auto"
              />
            </section>
          )}

          {!loading && activeTab === "events" && (
            <EventsTab
              canManage={canManage}
              isClient={isClient}
              eventForm={eventForm}
              setEventForm={setEventForm}
              createEvent={createEvent}
              events={events}
              updateEventStatus={updateEventStatus}
            />
          )}

          {!loading && activeTab === "proposals" && (
            <ProposalsTab
              canManage={canManage}
              proposalForm={proposalForm}
              setProposalForm={setProposalForm}
              createProposal={createProposal}
              events={events}
              proposals={proposals}
              approveProposal={approveProposal}
              rejectProposal={rejectProposal}
            />
          )}

          {!loading && activeTab === "invoices" && (
            <InvoicesTab invoices={invoices} payInvoice={payInvoice} downloadInvoice={downloadInvoice} />
          )}

          {!loading && activeTab === "vendors" && (
            <VendorsTab
              vendorForm={vendorForm}
              setVendorForm={setVendorForm}
              createVendor={createVendor}
              assignmentForm={assignmentForm}
              setAssignmentForm={setAssignmentForm}
              createAssignment={createAssignment}
              vendors={vendors}
              assignments={assignments}
              events={events}
              updateAssignmentStatus={updateAssignmentStatus}
            />
          )}

          {!loading && activeTab === "assignments" && (
            <AssignmentsTab assignments={assignments} updateAssignmentStatus={updateAssignmentStatus} />
          )}

          {!loading && activeTab === "reviews" && (
            <ReviewsTab
              isClient={isClient}
              canManage={canManage}
              reviewForm={reviewForm}
              setReviewForm={setReviewForm}
              submitReview={submitReview}
              reviews={reviews}
              events={events}
              updateReview={updateReview}
            />
          )}

          {!loading && activeTab === "users" && (
            <UsersTab userForm={userForm} setUserForm={setUserForm} createUser={createUser} users={users} />
          )}
        </section>
      </section>
    </main>
  );
};

const Overview = ({ stats, isClient, isVendor, events, assignments, invoices }) => {
  const nextEvent = events.find((event) => new Date(event.eventDate) >= new Date());

  return (
    <>
      <div className="stats-grid">
        <StatCard icon={<CalendarDays size={22} />} label={isVendor ? "Assignments" : "Events"} value={stats.events || stats.assignments || 0} />
        <StatCard icon={<Check size={22} />} label={isClient ? "Proposals" : "Confirmed"} value={stats.proposals || stats.confirmed || stats.active || 0} />
        <StatCard icon={<IndianRupee size={22} />} label={isClient ? "Balance" : "Revenue"} value={formatCurrency(stats.balance || stats.revenue || stats.quoteValue || 0)} />
        <StatCard icon={<UsersRound size={22} />} label={isVendor ? "Completed" : "Vendors"} value={stats.completed || stats.vendors || 0} />
      </div>

      <section className="two-column">
        <article className="tool-panel">
          <h3>Next event</h3>
          {nextEvent ? (
            <div className="detail-stack">
              <strong>{nextEvent.eventType}</strong>
              <span>{formatDate(nextEvent.eventDate)}</span>
              <span>{nextEvent.location || "Location not set"}</span>
              <StatusBadge value={nextEvent.status} />
            </div>
          ) : (
            <EmptyState title="No upcoming event" body="New event requests will appear here." />
          )}
        </article>

        <article className="tool-panel">
          <h3>{isVendor ? "Latest assignments" : "Recent invoices"}</h3>
          {isVendor ? (
            assignments.length ? (
              <div className="compact-list">
                {assignments.slice(0, 4).map((item) => (
                  <span key={item._id}>
                    {item.service}
                    <StatusBadge value={item.status} />
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState />
            )
          ) : invoices.length ? (
            <div className="compact-list">
              {invoices.slice(0, 4).map((invoice) => (
                <span key={invoice._id}>
                  {invoice.invoiceNumber}
                  <strong>{formatCurrency(invoice.total)}</strong>
                </span>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </article>
      </section>
    </>
  );
};

const EventsTab = ({ canManage, isClient, eventForm, setEventForm, createEvent, events, updateEventStatus }) => (
  <>
    {isClient && (
      <form className="tool-panel form-panel flat" onSubmit={createEvent}>
        <h3>New event request</h3>
        <div className="form-grid two">
          <label>
            Event type
            <select name="eventType" value={eventForm.eventType} onChange={updateObject(setEventForm)}>
              <option>Wedding</option>
              <option>Corporate</option>
              <option>Birthday</option>
              <option>Concert</option>
              <option>Product Launch</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Event date
            <input type="date" name="eventDate" value={eventForm.eventDate} onChange={updateObject(setEventForm)} required />
          </label>
          <label>
            Budget
            <input name="budget" value={eventForm.budget} onChange={updateObject(setEventForm)} />
          </label>
          <label>
            Guest count
            <input type="number" min="1" name="guestCount" value={eventForm.guestCount} onChange={updateObject(setEventForm)} />
          </label>
          <label>
            Location
            <input name="location" value={eventForm.location} onChange={updateObject(setEventForm)} />
          </label>
        </div>
        <label>
          Requirements
          <textarea name="message" value={eventForm.message} onChange={updateObject(setEventForm)} rows="3" />
        </label>
        <button className="button primary" type="submit">
          <Plus size={18} />
          Create Event
        </button>
      </form>
    )}

    <section className="tool-panel">
      <h3>Event requests</h3>
      {events.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Plan</th>
                <th>Client</th>
                <th>Date</th>
                <th>Location</th>
                <th>Status</th>
                {canManage && <th>Update</th>}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event._id}>
                  <td>{event.eventType}</td>
                  <td>
                    {event.selectedPackage?.name ? (
                      <span>
                        {event.selectedPackage.name}
                        <br />
                        <strong>{formatCurrency(event.selectedPackage.price)}</strong>
                      </span>
                    ) : (
                      "Custom"
                    )}
                  </td>
                  <td>{event.name}</td>
                  <td>{formatDate(event.eventDate)}</td>
                  <td>{event.location || "N/A"}</td>
                  <td>
                    <StatusBadge value={event.status} />
                  </td>
                  {canManage && (
                    <td>
                      <select value={event.status} onChange={(input) => updateEventStatus(event._id, input.target.value)}>
                        {eventStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  </>
);

const ProposalsTab = ({
  canManage,
  proposalForm,
  setProposalForm,
  createProposal,
  events,
  proposals,
  approveProposal,
  rejectProposal
}) => (
  <>
    {canManage && (
      <form className="tool-panel form-panel flat" onSubmit={createProposal}>
        <h3>Proposal generator</h3>
        <div className="form-grid two">
          <label>
            Event
            <select name="event" value={proposalForm.event} onChange={updateObject(setProposalForm)} required>
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event._id} value={event._id}>
                  {event.eventType} - {event.name} - {formatDate(event.eventDate)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input name="title" value={proposalForm.title} onChange={updateObject(setProposalForm)} required />
          </label>
          <label>
            Item name
            <input name="itemName" value={proposalForm.itemName} onChange={updateObject(setProposalForm)} required />
          </label>
          <label>
            Unit price
            <input type="number" name="unitPrice" value={proposalForm.unitPrice} onChange={updateObject(setProposalForm)} required />
          </label>
          <label>
            Quantity
            <input type="number" min="1" name="quantity" value={proposalForm.quantity} onChange={updateObject(setProposalForm)} />
          </label>
          <label>
            Discount
            <input type="number" name="discount" value={proposalForm.discount} onChange={updateObject(setProposalForm)} />
          </label>
        </div>
        <label>
          Summary
          <textarea name="summary" value={proposalForm.summary} onChange={updateObject(setProposalForm)} rows="3" />
        </label>
        <label>
          Terms
          <textarea name="terms" value={proposalForm.terms} onChange={updateObject(setProposalForm)} rows="3" />
        </label>
        <button className="button primary" type="submit">
          <Send size={18} />
          Send Proposal
        </button>
      </form>
    )}

    <section className="tool-panel">
      <h3>Proposals</h3>
      {proposals.length ? (
        <div className="card-list">
          {proposals.map((proposal) => (
            <article className="record-card" key={proposal._id}>
              <div>
                <h4>{proposal.title}</h4>
                <p>{proposal.summary || proposal.event?.eventType}</p>
                <strong>{formatCurrency(proposal.total)}</strong>
              </div>
              <div className="record-actions">
                <StatusBadge value={proposal.status} />
                {proposal.status === "sent" && (
                  <>
                    <button className="button primary compact" onClick={() => approveProposal(proposal._id)}>
                      <Check size={16} />
                      Approve
                    </button>
                    <button className="button ghost compact" onClick={() => rejectProposal(proposal._id)}>
                      Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  </>
);

const InvoicesTab = ({ invoices, payInvoice, downloadInvoice }) => (
  <section className="tool-panel">
    <h3>Invoices and payments</h3>
    {invoices.length ? (
      <div className="card-list">
        {invoices.map((invoice) => {
          const balance = Math.max(invoice.total - invoice.amountPaid, 0);
          return (
            <article className="record-card" key={invoice._id}>
              <div>
                <h4>{invoice.invoiceNumber}</h4>
                <p>{invoice.event?.eventType || "Event"} - {formatDate(invoice.dueDate)}</p>
                <strong>{formatCurrency(invoice.total)}</strong>
              </div>
              <div className="record-actions">
                <StatusBadge value={invoice.status} />
                <span>Paid {formatCurrency(invoice.amountPaid)}</span>
                <button className="button ghost compact" onClick={() => downloadInvoice(invoice)}>
                  <Download size={16} />
                  PDF
                </button>
                {balance > 0 && (
                  <button className="button primary compact" onClick={() => payInvoice(invoice)}>
                    <BadgeIndianRupee size={16} />
                    Pay
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    ) : (
      <EmptyState />
    )}
  </section>
);

const VendorsTab = ({
  vendorForm,
  setVendorForm,
  createVendor,
  assignmentForm,
  setAssignmentForm,
  createAssignment,
  vendors,
  assignments,
  events,
  updateAssignmentStatus
}) => (
  <>
    <section className="two-column">
      <form className="tool-panel form-panel flat" onSubmit={createVendor}>
        <h3>Add vendor</h3>
        <label>
          Name
          <input name="name" value={vendorForm.name} onChange={updateObject(setVendorForm)} required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={vendorForm.email} onChange={updateObject(setVendorForm)} />
        </label>
        <label>
          Phone
          <input name="phone" value={vendorForm.phone} onChange={updateObject(setVendorForm)} />
        </label>
        <label>
          Service category
          <input name="serviceCategory" value={vendorForm.serviceCategory} onChange={updateObject(setVendorForm)} required />
        </label>
        <button className="button primary" type="submit">
          <Plus size={18} />
          Add Vendor
        </button>
      </form>

      <form className="tool-panel form-panel flat" onSubmit={createAssignment}>
        <h3>Assign vendor</h3>
        <label>
          Event
          <select name="event" value={assignmentForm.event} onChange={updateObject(setAssignmentForm)} required>
            <option value="">Select event</option>
            {events.map((event) => (
              <option key={event._id} value={event._id}>
                {event.eventType} - {event.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vendor
          <select name="vendor" value={assignmentForm.vendor} onChange={updateObject(setAssignmentForm)} required>
            <option value="">Select vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor._id} value={vendor._id}>
                {vendor.name} - {vendor.serviceCategory}
              </option>
            ))}
          </select>
        </label>
        <label>
          Service
          <input name="service" value={assignmentForm.service} onChange={updateObject(setAssignmentForm)} required />
        </label>
        <label>
          Quote amount
          <input type="number" name="quoteAmount" value={assignmentForm.quoteAmount} onChange={updateObject(setAssignmentForm)} />
        </label>
        <button className="button primary" type="submit">
          <Handshake size={18} />
          Assign
        </button>
      </form>
    </section>

    <AssignmentsTab assignments={assignments} updateAssignmentStatus={updateAssignmentStatus} />
  </>
);

const AssignmentsTab = ({ assignments, updateAssignmentStatus }) => (
  <section className="tool-panel">
    <h3>Vendor assignments</h3>
    {assignments.length ? (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Vendor</th>
              <th>Event</th>
              <th>Quote</th>
              <th>Status</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment._id}>
                <td>{assignment.service}</td>
                <td>{assignment.vendor?.name || "Vendor"}</td>
                <td>{assignment.event?.eventType || "Event"}</td>
                <td>{formatCurrency(assignment.quoteAmount)}</td>
                <td>
                  <StatusBadge value={assignment.status} />
                </td>
                <td>
                  <select value={assignment.status} onChange={(input) => updateAssignmentStatus(assignment._id, input.target.value)}>
                    {assignmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState />
    )}
  </section>
);

const ReviewsTab = ({ isClient, canManage, reviewForm, setReviewForm, submitReview, reviews, events, updateReview }) => (
  <>
    {isClient && (
      <form className="tool-panel form-panel flat" onSubmit={submitReview}>
        <h3>Submit review</h3>
        <label>
          Event
          <select name="event" value={reviewForm.event} onChange={updateObject(setReviewForm)}>
            <option value="">General review</option>
            {events.map((event) => (
              <option key={event._id} value={event._id}>
                {event.eventType} - {formatDate(event.eventDate)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rating
          <select name="rating" value={reviewForm.rating} onChange={updateObject(setReviewForm)}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </label>
        <label>
          Comment
          <textarea name="comment" value={reviewForm.comment} onChange={updateObject(setReviewForm)} rows="3" required />
        </label>
        <button className="button primary" type="submit">
          <Star size={18} />
          Submit Review
        </button>
      </form>
    )}

    {canManage ? (
      <section className="tool-panel">
        <h3>Review approval</h3>
        {reviews.length ? (
          <div className="card-list">
            {reviews.map((review) => (
              <article className="record-card" key={review._id}>
                <div>
                  <h4>{review.name}</h4>
                  <p>{review.comment}</p>
                  <span>{review.rating} stars</span>
                </div>
                <div className="record-actions">
                  <StatusBadge value={review.status} />
                  <button className="button primary compact" onClick={() => updateReview(review._id, { status: "approved", featured: true })}>
                    Approve
                  </button>
                  <button className="button ghost compact" onClick={() => updateReview(review._id, { status: "rejected", featured: false })}>
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
    ) : null}
  </>
);

const UsersTab = ({ userForm, setUserForm, createUser, users }) => (
  <>
    <form className="tool-panel form-panel flat" onSubmit={createUser}>
      <h3>Create user</h3>
      <div className="form-grid two">
        <label>
          Name
          <input name="name" value={userForm.name} onChange={updateObject(setUserForm)} required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={userForm.email} onChange={updateObject(setUserForm)} required />
        </label>
        <label>
          Phone
          <input name="phone" value={userForm.phone} onChange={updateObject(setUserForm)} />
        </label>
        <label>
          Password
          <input type="password" name="password" value={userForm.password} onChange={updateObject(setUserForm)} required />
        </label>
        <label>
          Role
          <select name="role" value={userForm.role} onChange={updateObject(setUserForm)}>
            <option value="staff">Staff</option>
            <option value="vendor">Vendor</option>
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {userForm.role === "vendor" && (
          <label>
            Service category
            <input name="serviceCategory" value={userForm.serviceCategory} onChange={updateObject(setUserForm)} />
          </label>
        )}
      </div>
      <button className="button primary" type="submit">
        <Plus size={18} />
        Create User
      </button>
    </form>

    <section className="tool-panel">
      <h3>Users</h3>
      {users.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  </>
);

const updateObject = (setter) => (event) => {
  setter((current) => ({
    ...current,
    [event.target.name]: event.target.value
  }));
};

export default Dashboard;
