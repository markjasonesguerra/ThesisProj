import "../styles/admin-base.css";
import {
	CalendarDays,
	MapPin,
	Clock,
	Plus,
	PencilLine,
	ExternalLink,
	Smartphone,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/admin";

const CATEGORY_OPTIONS = [
	{ value: "Assembly", label: "General Assembly" },
	{ value: "Training", label: "Seminar / Training" },
	{ value: "Benefit", label: "Health & Wellness" },
	{ value: "Outreach", label: "Community Outreach" },
	{ value: "Other", label: "Other" },
];

const STATUS_OPTIONS = ["Draft", "Published", "Archived"];

const CATEGORY_LABEL_LOOKUP = new Map(
	CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
);

const EVENT_TABLE_COLUMN_WIDTHS = ["36%", "18%", "12%", "12%", "8%", "5%", "9%"];

const DEFAULT_ADMIN_ID = (() => {
	const envValue = process.env.REACT_APP_DEFAULT_ADMIN_ID;
	const parsed = envValue ? Number.parseInt(envValue, 10) : NaN;
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}
	return 1;
})();

function resolvePreviewSrc(value) {
	if (!value) return null;
	const src = String(value).trim();
	if (!src) return null;
	if (/^https?:\/\//i.test(src)) {
		return src;
	}

	const baseCandidates = [
		process.env.REACT_APP_UPLOADS_BASE_URL,
		process.env.REACT_APP_MEDIA_BASE_URL,
		process.env.REACT_APP_API_URL,
		process.env.REACT_APP_FILE_BASE_URL,
		process.env.REACT_APP_CLIENT_URL,
		process.env.REACT_APP_API_PORT
			? `http://localhost:${process.env.REACT_APP_API_PORT}`
			: null,
	];

	const base = baseCandidates.find((candidate) => {
		if (!candidate) return false;
		const trimmed = String(candidate).trim();
		return trimmed.length > 0;
	});

	if (!base) {
		return src;
	}

	return `${String(base).trim().replace(/\/+$/, "")}/${src.replace(
		/^\/+/, "",
	)}`;
}

function formatDateTime(value) {
	if (!value) return "—";
	const date = new Date(value);
	if (!Number.isNaN(date.getTime())) {
		return date.toLocaleString("en-PH", {
			month: "short",
			day: "2-digit",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	}

	const fallback = String(value);
	const match = fallback.match(
		/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/
	);
	if (match) {
		const [, datePart, timePart] = match;
		return timePart ? `${datePart} ${timePart}` : datePart;
	}

	return "—";
}

function toInputDate(value) {
	if (!value) return "";
	const text = String(value);
	const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
	if (match) return match[1];

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().slice(0, 10);
}

function toInputTime(value) {
	if (!value) return "";
	const text = String(value);
	const match = text.match(/(?:T|\s)(\d{2}:\d{2})/);
	if (match) return match[1];

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().slice(11, 16);
}

function combineDateTime(date, time) {
	if (!date || !time) return null;
	const trimmedTime = String(time).trim();
	if (!trimmedTime) return null;

	const amPmMatch = trimmedTime.match(/^([0-1]?\d):([0-5]\d)\s?(AM|PM)$/i);
	if (amPmMatch) {
		let hours = Number(amPmMatch[1]);
		const minutes = amPmMatch[2];
		const period = amPmMatch[3].toUpperCase();
		if (period === "PM" && hours !== 12) {
			hours += 12;
		}
		if (period === "AM" && hours === 12) {
			hours = 0;
		}
		const hoursString = String(hours).padStart(2, "0");
		return `${date} ${hoursString}:${minutes}`;
	}

	const twentyFourHourMatch = trimmedTime.match(/^([0-1]?\d|2[0-3]):([0-5]\d)$/);
	if (twentyFourHourMatch) {
		const hours = String(twentyFourHourMatch[1]).padStart(2, "0");
		const minutes = twentyFourHourMatch[2];
		return `${date} ${hours}:${minutes}`;
	}

	return `${date} ${trimmedTime}`;
}

function getStatusTone(status) {
	if (!status) return "is-blue";
	const lowered = String(status).toLowerCase();
	if (lowered === "published") return "is-blue";
	if (lowered === "draft") return "is-orange";
	if (lowered === "archived") return "is-red";
	return "is-blue";
}

function formatDateLabel(value) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return String(value);
	}
	return date.toLocaleDateString("en-CA");
}

function formatTimeLabel(value) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "—";
	}
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function buildDescriptionPreview(value, maxLength = 120) {
	const text = String(value ?? "").trim();
	if (!text) return "No description provided yet.";
	if (text.length <= maxLength) return text;
	const shortened = text.slice(0, maxLength);
	const safe = shortened.replace(/\s+\S*$/, "");
	return `${safe.trim()}…`;
}

function buildFormStateFromEvent(event) {
	if (!event) {
		return {
			title: "",
			category: CATEGORY_OPTIONS[0]?.value ?? "Other",
			description: "",
			date: "",
			time: "",
			venue: "",
			capacity: "",
			previewImage: "",
			status: STATUS_OPTIONS[0],
			externalLinkEnabled: false,
			externalLink: "",
		};
	}

	return {
		title: event.title ?? "",
		category: CATEGORY_OPTIONS.some((option) => option.value === event.category)
			? event.category
			: CATEGORY_OPTIONS[0]?.value ?? "Other",
		description: event.description ?? "",
		date: toInputDate(event.startAt),
		time: toInputTime(event.startAt),
		venue: event.venue ?? "",
		capacity:
			event.capacity === null || event.capacity === undefined
				? ""
				: String(event.capacity),
		previewImage: event.previewImage ?? "",
		status: STATUS_OPTIONS.includes(event.status)
			? event.status
			: STATUS_OPTIONS[0],
		externalLinkEnabled: Boolean(event.externalLink),
		externalLink: event.externalLink ?? "",
	};
}

function buildServerErrorMessage(payload, fallbackMessage) {
	const baseMessage = typeof payload?.message === "string"
		? payload.message
		: fallbackMessage;
	const details = payload?.details;
	const extraParts = [];

	if (payload?.errorCode) {
		extraParts.push(`code: ${payload.errorCode}`);
	}

	if (typeof details === "string" && details.trim()) {
		extraParts.push(details.trim());
	} else if (details && typeof details === "object") {
		if (typeof details.hint === "string" && details.hint.trim()) {
			extraParts.push(details.hint.trim());
		}
		if (typeof details.reason === "string" && details.reason.trim()) {
			extraParts.push(details.reason.trim());
		}
		if (typeof details.driverCode === "string" && details.driverCode.trim()) {
			extraParts.push(`driver: ${details.driverCode.trim()}`);
		}
		if (!extraParts.length) {
			try {
				const serialized = JSON.stringify(details);
				if (serialized && serialized !== "{}") {
					extraParts.push(serialized);
				}
			} catch (_err) {
				// ignore JSON issues and avoid blocking user feedback
			}
		}
	}

	if (!extraParts.length) {
		return baseMessage;
	}

	return `${baseMessage} (${extraParts.join(" | ")})`;
}

export default function EventManagement() {
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState(null);
	const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 50 });
	const [attendanceStats, setAttendanceStats] = useState({
		scheduled: 0,
		attended: 0,
		waitlisted: 0,
	});
	const [dialogState, setDialogState] = useState({ mode: null, event: null });
	const [formState, setFormState] = useState(buildFormStateFromEvent(null));
	const [formErrors, setFormErrors] = useState({});
	const [dialogError, setDialogError] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const isMountedRef = useRef(false);

	const fetchEvents = useCallback(async () => {
		setLoading(true);
		setErrorMessage(null);
		try {
			const res = await api.listEvents({ pageSize: 50 });
			const payload = res?.data ?? {};
			const items = Array.isArray(payload.results)
				? payload.results
				: Array.isArray(payload)
				? payload
				: [];
			const isSamplePayload = Boolean(payload.meta?.isSample);

			const fetchedMeta = payload.meta ?? {
				total: items.length,
				page: 1,
				pageSize: 50,
			};

			let aggregatedAttendance = {
				scheduled: 0,
				attended: 0,
				waitlisted: 0,
			};

			const summaryByEvent = new Map();
			const detailByEvent = new Map();

			const detailTargets = isSamplePayload
				? []
				: items.filter((event) => {
					const parsedId = Number(event.id);
					return Number.isFinite(parsedId) && parsedId > 0;
				});

			if (detailTargets.length) {
				const details = await Promise.allSettled(
					detailTargets.map((event) =>
						api.getEvent(event.id).then((result) => ({
							id: event.id,
							payload: result?.data ?? {},
						})),
					),
				);

				details.forEach((result) => {
					if (result.status !== "fulfilled") {
						return;
					}

					const { id, payload: detailPayload } = result.value;
					const registrations = Array.isArray(detailPayload?.registrations)
						? detailPayload.registrations
						: [];

					const detailEvent = detailPayload?.event ?? null;
					if (detailEvent) {
						detailByEvent.set(id, detailEvent);
					}

					const summary = registrations.reduce(
						(accumulator, registration) => {
							const status = registration.status ?? "unknown";
							accumulator.total += 1;
							accumulator.statusCounts[status] =
								(accumulator.statusCounts[status] ?? 0) + 1;

							if (status === "registered") {
								accumulator.scheduled += 1;
							}
							if (status === "attended") {
								accumulator.attended += 1;
							}
							if (status === "waitlisted") {
								accumulator.waitlisted += 1;
							}

							return accumulator;
						},
						{
							total: 0,
							statusCounts: {},
							scheduled: 0,
							attended: 0,
							waitlisted: 0,
						},
					);

					aggregatedAttendance = {
						scheduled: aggregatedAttendance.scheduled + summary.scheduled,
						attended: aggregatedAttendance.attended + summary.attended,
						waitlisted: aggregatedAttendance.waitlisted + summary.waitlisted,
					};

					summaryByEvent.set(id, summary);
				});
			}

			if (!isMountedRef.current) {
				return;
			}

			const enriched = items.map((event) => {
				const summary =
					summaryByEvent.get(event.id) ?? {
						total: 0,
						statusCounts: {},
						scheduled: 0,
						attended: 0,
						waitlisted: 0,
					};
				const detailEvent = detailByEvent.get(event.id) ?? {};

				const rawPreview =
					detailEvent.previewImage ?? event.previewImage ?? null;

				return {
					...event,
					...detailEvent,
					registrationSummary: summary,
					previewImage: resolvePreviewSrc(rawPreview),
					status: detailEvent.status ?? event.status ?? null,
					externalLink: detailEvent.externalLink ?? event.externalLink ?? null,
				};
			});

			setEvents(enriched);
			setMeta({
				total: Number.isFinite(Number(fetchedMeta.total))
					? Number(fetchedMeta.total)
					: enriched.length,
				page: fetchedMeta.page ?? 1,
				pageSize: fetchedMeta.pageSize ?? 50,
				isSample: Boolean(fetchedMeta.isSample),
			});
			setAttendanceStats(aggregatedAttendance);
		} catch (err) {
			console.error("Unable to load events", err);
			if (!isMountedRef.current) {
				return;
			}
			setEvents([]);
			setAttendanceStats({ scheduled: 0, attended: 0, waitlisted: 0 });
			setMeta({ total: 0, page: 1, pageSize: 50 });
			setErrorMessage(
				"We could not load events right now. Please try refreshing the page.",
			);
		} finally {
			if (isMountedRef.current) {
				setLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		isMountedRef.current = true;
		fetchEvents();
		return () => {
			isMountedRef.current = false;
		};
	}, [fetchEvents]);

	const logisticsChecklist = [
		"Confirm venue booking and deposit",
		"Send speaker briefings and slide templates",
		"Coordinate registration desk staffing",
		"Prepare digital feedback form",
	];

	const openCreateDialog = () => {
		setDialogState({ mode: "create", event: null });
		setFormState(buildFormStateFromEvent(null));
		setFormErrors({});
		setDialogError(null);
	};

	const openEditDialog = (event) => {
		if (!event) return;
		setDialogState({ mode: "edit", event });
		setFormState(buildFormStateFromEvent(event));
		setFormErrors({});
		setDialogError(null);
	};

	const closeDialog = () => {
		setDialogState({ mode: null, event: null });
		setFormState(buildFormStateFromEvent(null));
		setFormErrors({});
		setDialogError(null);
		setIsSubmitting(false);
		setIsDeleting(false);
	};

	const handleFieldChange = (field) => (event) => {
		const value = event.target.value;
		setFormState((previous) => ({
			...previous,
			[field]: value,
		}));
	};

	const handleExternalToggle = (event) => {
		const checked = event.target.checked;
		setFormState((previous) => ({
			...previous,
			externalLinkEnabled: checked,
			externalLink: checked ? previous.externalLink : "",
		}));
		setFormErrors((previous) => {
			if (!checked && previous.externalLink) {
				const { externalLink, ...rest } = previous;
				return rest;
			}
			return previous;
		});
	};

	const enableExternalLink = () => {
		setFormState((previous) => {
			if (previous.externalLinkEnabled) {
				return previous;
			}
			return {
				...previous,
				externalLinkEnabled: true,
			};
		});
	};

	const validateForm = () => {
		const errors = {};

		if (!formState.title.trim()) {
			errors.title = "Event title is required.";
		}
		if (!formState.category) {
			errors.category = "Select a category.";
		}
		if (!formState.description.trim()) {
			errors.description = "Provide an event description.";
		}
		if (!formState.date) {
			errors.date = "Event date is required.";
		}
		if (!formState.time) {
			errors.time = "Event time is required.";
		}
		if (!formState.venue.trim()) {
			errors.venue = "Venue or location is required.";
		}
		if (!formState.status) {
			errors.status = "Select a status.";
		}

		const capacityValue = formState.capacity.trim();
		if (capacityValue && Number.isNaN(Number(capacityValue))) {
			errors.capacity = "Enter a valid capacity number.";
		}

		if (formState.externalLinkEnabled) {
			const linkValue = formState.externalLink.trim();
			if (!linkValue) {
				errors.externalLink = "Provide an external link URL.";
			}
		}

		return errors;
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		const errors = validateForm();
		setFormErrors(errors);
		if (Object.keys(errors).length) {
			return;
		}

		const capacityValue = formState.capacity.trim();
		const startDateTime = combineDateTime(formState.date, formState.time);
		const existingCreator = dialogState.event?.createdBy;
		const parsedCreator = existingCreator !== undefined && existingCreator !== null
			? Number(existingCreator)
			: NaN;
		const resolvedAdminId = Number.isFinite(parsedCreator) && parsedCreator > 0
			? parsedCreator
			: DEFAULT_ADMIN_ID;

		const payload = {
			title: formState.title.trim(),
			category: formState.category,
			description: formState.description.trim(),
			venue: formState.venue.trim(),
			startAt: startDateTime,
			endAt: startDateTime,
			capacity: capacityValue ? Number(capacityValue) : null,
			previewImage: formState.previewImage.trim() || null,
			status: formState.status,
			externalLink: formState.externalLinkEnabled
				? formState.externalLink.trim()
				: null,
			adminId: resolvedAdminId,
		};

		setIsSubmitting(true);
		setDialogError(null);

		try {
			if (dialogState.mode === "edit" && dialogState.event?.id) {
				await api.updateEvent(dialogState.event.id, payload);
			} else {
				await api.createEvent(payload);
			}
			await fetchEvents();
			closeDialog();
		} catch (err) {
			console.error("Unable to save event", err);
			if (isMountedRef.current) {
				const serverPayload = err?.response?.data ?? null;
				const fallback = "Unable to save event. Please try again.";
				const composed = buildServerErrorMessage(serverPayload, fallback);
				setDialogError(composed);
			}
		} finally {
			if (isMountedRef.current) {
				setIsSubmitting(false);
			}
		}
	};

	const handleDelete = async () => {
		if (dialogState.mode !== "edit" || !dialogState.event?.id) {
			return;
		}

		const parsedId = Number(dialogState.event.id);
		if (!Number.isFinite(parsedId) || parsedId <= 0) {
			return;
		}

		const confirmed = window.confirm(
			"Delete this event? This will remove it from the directory and mobile preview.",
		);
		if (!confirmed) {
			return;
		}

		setIsDeleting(true);
		setDialogError(null);

		try {
			await api.deleteEvent(parsedId);
			await fetchEvents();
			closeDialog();
		} catch (err) {
			console.error("Unable to delete event", err);
			if (isMountedRef.current) {
				const serverPayload = err?.response?.data ?? null;
				const fallback = "Unable to delete event. Please try again.";
				const composed = buildServerErrorMessage(serverPayload, fallback);
				setDialogError(composed);
			}
		} finally {
			if (isMountedRef.current) {
				setIsDeleting(false);
			}
		}
	};

	const renderStatusChip = (event) => {
		if (event.status) {
			return (
				<span className={`admin-chip ${getStatusTone(event.status)}`}>
					{event.status}
				</span>
			);
		}

		const startDate = event.startAt ? new Date(event.startAt) : null;
		const endDate = event.endAt ? new Date(event.endAt) : null;
		const now = new Date();

		if (startDate && endDate && now >= startDate && now <= endDate) {
			return <span className="admin-chip is-orange">In progress</span>;
		}

		if (startDate && now >= startDate) {
			return <span className="admin-chip is-green">Completed</span>;
		}

		return <span className="admin-chip is-blue">Upcoming</span>;
	};

	const mobilePreviewItems = events;

	return (
		<div className="admin-page admin-stack-lg">
			<header className="admin-row">
				<div>
					<h1>Event Management</h1>
					<p className="admin-muted">
						Coordinate union events and attendance tracking.
					</p>
				</div>
				<div className="admin-row" style={{ gap: "12px" }}>
					<span className="admin-pill">Event calendar</span>
					<button
						type="button"
						className="admin-button is-primary"
						onClick={openCreateDialog}
					>
						<Plus size={16} />
						Create event
					</button>
				</div>
			</header>

			<section className="admin-card-grid cols-3">
				<article className="admin-card">
					<div className="admin-card__label">Events total</div>
					<div className="admin-card__value">{loading ? "—" : meta.total}</div>
					<div className="admin-card__meta">Upcoming and past events</div>
				</article>
				<article className="admin-card">
					<div className="admin-card__label">Scheduled attendees</div>
					<div className="admin-card__value">
						{loading ? "—" : attendanceStats.scheduled}
					</div>
					<div className="admin-card__meta">
						Active registrations across events
					</div>
				</article>
				<article className="admin-card">
					<div className="admin-card__label">Attended / waitlisted</div>
					<div className="admin-card__value">
						{loading
							? "—"
							: `${attendanceStats.attended} / ${attendanceStats.waitlisted}`}
					</div>
					<div className="admin-card__meta">
						Historical attendance vs waitlist
					</div>
				</article>
			</section>

			<section className="admin-surface admin-stack-md">
				<div
					className="admin-row"
					style={{
						gap: "16px",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
					}}
				>
					<div className="admin-section-title">
						<CalendarDays size={18} />
						<div>
							<h2>Events Directory</h2>
							<p className="admin-muted">
								These events will appear as cards in the ALUzon mobile app&apos;s Events tab.
							</p>
						</div>
					</div>
					<div style={{ minWidth: "16px" }} />
				</div>
				{errorMessage && !loading ? (
					<div className="admin-empty-state">
						<p>{errorMessage}</p>
					</div>
				) : (
					<div className="admin-stack">
						{meta.isSample && !loading ? (
							<div
								className="admin-muted"
								style={{
									background: "#f1f5f9",
									borderRadius: "10px",
									padding: "10px 14px",
								}}
							>
								Showing sample events until a new event is created.
							</div>
						) : null}
						{loading ? (
							<div className="admin-empty-state">
								<p>Loading…</p>
							</div>
						) : events.length === 0 ? (
							<div className="admin-empty-state">
								<p>
									No events have been scheduled yet. Add an event to see it listed here.
								</p>
							</div>
						) : (
							<div className="admin-events-table-wrapper">
								<table className="admin-events-table">
									<colgroup>
										{EVENT_TABLE_COLUMN_WIDTHS.map((width, index) => (
											<col key={`events-col-${index}`} style={{ width }} />
										))}
									</colgroup>
									<thead>
										<tr>
											<th scope="col">Event Preview</th>
											<th scope="col">Details</th>
											<th scope="col">Category</th>
											<th scope="col">Date &amp; Time</th>
											<th scope="col">External Link</th>
											<th scope="col">Status</th>
											<th scope="col" className="admin-events-actions-header">Actions</th>
										</tr>
									</thead>
									<tbody>
										{events.map((eventItem) => {
											const categoryLabel =
												CATEGORY_LABEL_LOOKUP.get(eventItem.category) ??
												eventItem.category ??
												"Other";

											const hasExternalLink = Boolean(eventItem.externalLink);
											const dateLabel = formatDateLabel(eventItem.startAt);
											const timeLabel = formatTimeLabel(eventItem.startAt);
											const createdLabel = formatDateLabel(
												eventItem.createdAt ?? eventItem.startAt,
											);
											const descriptionPreview = buildDescriptionPreview(
												eventItem.description,
												90,
											);
											const titleLabel = eventItem.title?.trim() || "Untitled event";
											const venueLabel = eventItem.venue?.trim() || "—";
											const canEdit = Number.isFinite(Number(eventItem.id));

											return (
												<tr key={eventItem.id}>
													<td>
														<div className="admin-events-preview">
															<div className="admin-events-preview__image">
															{eventItem.previewImage ? (
																<img
																	src={eventItem.previewImage}
																	alt={`Preview for ${eventItem.title}`}
																	loading="lazy"
																/>
															) : (
																<div className="admin-image-fallback">
																	<span>No preview</span>
																</div>
															)}
															</div>
															<div className="admin-events-preview__text">
																<span
																	className="admin-events-preview__title"
																	title={titleLabel}
																>
																	{titleLabel}
																</span>
																<span
																	className="admin-events-preview__description"
																	title={eventItem.description?.trim() || "No description provided yet."}
																>
																	{descriptionPreview}
																</span>
															</div>
														</div>
													</td>
													<td>
														<div className="admin-events-details">
															<div className="admin-events-details__item" title={venueLabel}>
																<MapPin size={14} />
																<span>{venueLabel}</span>
															</div>
															<div className="admin-events-details__item">
																<CalendarDays size={14} />
																<span>Created: {createdLabel}</span>
															</div>
														</div>
													</td>
													<td>
														<span className="admin-pill is-soft">{categoryLabel}</span>
													</td>
													<td>
														<div className="admin-events-schedule">
															<span>{dateLabel}</span>
															<span>{timeLabel}</span>
														</div>
													</td>
													<td>
														{hasExternalLink ? (
															<a
																href={eventItem.externalLink}
																target="_blank"
																rel="noopener noreferrer"
																className="admin-link-quiet"
															>
																Yes
															</a>
														) : (
															<span>No</span>
														)}
													</td>
													<td>{renderStatusChip(eventItem)}</td>
													<td>
														<div className="admin-events-actions">
															<button
																type="button"
																className="admin-button admin-button--ghost"
																onClick={() => {
																	if (!canEdit) return;
																	openEditDialog(eventItem);
																}}
																disabled={!canEdit}
															>
																<PencilLine size={14} />
																Edit
															</button>
															{hasExternalLink ? (
																<a
																	className="admin-button admin-button--ghost"
																	href={eventItem.externalLink}
																	target="_blank"
																	rel="noopener noreferrer"
																>
																	<ExternalLink size={14} />
																	Preview
																</a>
															) : (
																<button
																	type="button"
																	className="admin-button admin-button--ghost"
																	disabled
																>
																	<ExternalLink size={14} />
																	Preview
																</button>
															)}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
									)}
								</div>
							)}
					</section>

					<section className="admin-surface admin-stack-md">
						<div className="admin-section-title">
							<Smartphone size={18} />
							<div>
								<h2>Mobile App Preview</h2>
								<p className="admin-muted">
									This is how events will appear in the ALUzon mobile app.
								</p>
							</div>
						</div>
						{loading ? (
							<div className="admin-empty-state">
								<p>Loading…</p>
							</div>
						) : mobilePreviewItems.length === 0 ? (
							<div className="admin-empty-state">
								<p>Add an event to preview how it will look on mobile.</p>
							</div>
						) : (
							<div className="admin-mobile-preview-grid">
								{mobilePreviewItems.map((eventItem) => {
									const dateLabel = formatDateLabel(eventItem.startAt);
									const timeLabel = formatTimeLabel(eventItem.startAt);
									const descriptionPreview = buildDescriptionPreview(eventItem.description, 140);
									const hasExternalLink = Boolean(eventItem.externalLink);

									return (
										<article key={`mobile-preview-${eventItem.id}`} className="admin-mobile-card">
											<div className="admin-mobile-card__image">
												{eventItem.previewImage ? (
													<img
														src={eventItem.previewImage}
														alt={`Preview for ${eventItem.title}`}
														loading="lazy"
													/>
												) : (
													<div className="admin-image-fallback">
														<span>No preview</span>
													</div>
												)}
												{hasExternalLink ? (
													<span className="admin-link-chip">
														<ExternalLink size={14} /> Link
													</span>
												) : null}
											</div>
											<div className="admin-mobile-card__body">
												<strong>{eventItem.title}</strong>
												<p className="admin-muted">{descriptionPreview}</p>
												<div className="admin-mobile-card__meta">
													<span>
														<CalendarDays size={14} /> {dateLabel}
													</span>
													<span>
														<Clock size={14} /> {timeLabel}
													</span>
												</div>
											</div>
										</article>
									);
								})}
							</div>
						)}
					</section>

			<section className="admin-surface admin-stack-md">
				<h2>Logistics checklist</h2>
				<div className="admin-list">
					{logisticsChecklist.map((item) => (
						<span key={item}>{item}</span>
					))}
				</div>
			</section>

			{dialogState.mode ? (
				<div className="admin-dialog" role="dialog" aria-modal="true">
					<div
						className="admin-dialog__backdrop"
						role="presentation"
						onClick={closeDialog}
					/>
					<div className="admin-dialog__panel">
						<div className="admin-dialog__header">
							<div>
								<h3>
									{dialogState.mode === "create"
										? "Create New Event"
										: "Edit Event"}
								</h3>
								<p className="admin-muted">
									{dialogState.mode === "create"
										? "Provide event information that will appear in the mobile app."
										: "Update the event details and save your changes."}
								</p>
							</div>
							<button
								type="button"
								className="admin-button admin-button--ghost"
								onClick={closeDialog}
							>
								<X size={16} />
								Close
							</button>
						</div>
						<form onSubmit={handleSubmit} className="admin-stack-md">
							<div className="admin-dialog__body">
								{dialogError ? (
									<div
										style={{
											border: "1px solid rgba(239, 68, 68, 0.4)",
											background: "rgba(254, 226, 226, 0.6)",
											color: "#b91c1c",
											borderRadius: "10px",
											padding: "12px 14px",
										}}
									>
										{dialogError}
									</div>
								) : null}

								<div className="admin-form-grid">
									<div className="admin-field">
										<span>Event Title *</span>
										<input
											type="text"
											placeholder="Enter event title"
											value={formState.title}
											onChange={handleFieldChange("title")}
										/>
										{formErrors.title ? (
											<small style={{ color: "#b91c1c" }}>{formErrors.title}</small>
										) : null}
									</div>
									<div className="admin-field">
										<span>Category *</span>
										<select
											value={formState.category}
											onChange={handleFieldChange("category")}
										>
											{CATEGORY_OPTIONS.map((option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
										{formErrors.category ? (
											<small style={{ color: "#b91c1c" }}>{formErrors.category}</small>
										) : null}
									</div>
								</div>

								<div className="admin-field">
									<span>Event Description *</span>
									<textarea
										rows={4}
										placeholder="Provide a detailed description that will appear in the mobile app"
										value={formState.description}
										onChange={handleFieldChange("description")}
									/>
									{formErrors.description ? (
										<small style={{ color: "#b91c1c" }}>
											{formErrors.description}
										</small>
									) : (
										<small>
											Include details such as agenda, key speakers, or registration notes.
										</small>
									)}
								</div>

								<div className="admin-form-grid">
									<div className="admin-field">
										<span>Event Date *</span>
										<input
											type="date"
											value={formState.date}
											onChange={handleFieldChange("date")}
										/>
										{formErrors.date ? (
											<small style={{ color: "#b91c1c" }}>{formErrors.date}</small>
										) : null}
									</div>
									<div className="admin-field">
										<span>Event Time *</span>
										<input
											type="time"
											value={formState.time}
											onChange={handleFieldChange("time")}
										/>
										{formErrors.time ? (
											<small style={{ color: "#b91c1c" }}>{formErrors.time}</small>
										) : null}
									</div>
									<div className="admin-field">
										<span>Status *</span>
										<select
											value={formState.status}
											onChange={handleFieldChange("status")}
										>
											{STATUS_OPTIONS.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
										{formErrors.status ? (
											<small style={{ color: "#b91c1c" }}>{formErrors.status}</small>
										) : null}
									</div>
								</div>

								<div className="admin-form-grid">
									<div className="admin-field">
										<span>Venue/Location *</span>
										<input
											type="text"
											placeholder="Complete venue address or location details"
											value={formState.venue}
											onChange={handleFieldChange("venue")}
										/>
										{formErrors.venue ? (
											<small style={{ color: "#b91c1c" }}>{formErrors.venue}</small>
										) : null}
									</div>
									<div className="admin-field">
										<span>Capacity</span>
										<input
											type="number"
											min="0"
											placeholder="Optional"
											value={formState.capacity}
											onChange={handleFieldChange("capacity")}
										/>
										{formErrors.capacity ? (
											<small style={{ color: "#b91c1c" }}>{formErrors.capacity}</small>
										) : (
											<small>Leave blank to keep capacity flexible.</small>
										)}
									</div>
								</div>

								<div className="admin-field">
									<span>Event Thumbnail Image URL</span>
									<input
										type="url"
										placeholder="https://example.com/image.jpg (recommended: 800x400px)"
										value={formState.previewImage}
										onChange={handleFieldChange("previewImage")}
									/>
									<small>
										This image will be displayed as the event card thumbnail in the mobile app.
									</small>
								</div>

								<div
									className={`admin-form-section ${
										formState.externalLinkEnabled ? "is-active" : "is-muted"
									}`}
								>
									<div className="admin-form-section__header">
										<div className="admin-form-section__title">
											<ExternalLink size={18} />
											<div>
												<strong id="external-link-redirect-heading">External Link Redirect</strong>
												<p
													id="external-link-redirect-helper"
													className="admin-form-section__description"
												>
													When enabled, tapping the event card will redirect users to an external website.
												</p>
											</div>
										</div>
										<label
											className="admin-switch"
											htmlFor="toggle-external-link"
										>
											<input
												id="toggle-external-link"
												type="checkbox"
												checked={formState.externalLinkEnabled}
												onChange={handleExternalToggle}
												aria-labelledby="external-link-redirect-heading external-link-redirect-helper"
											/>
											<span className="admin-switch__track" aria-hidden="true" />
										</label>
									</div>

									<div className="admin-form-section__body">
										<div className="admin-field">
											<span>External Link URL</span>
											<input
												type="url"
												placeholder="https://registration.example.com"
												value={formState.externalLink}
												onChange={handleFieldChange("externalLink")}
																					onFocus={enableExternalLink}
											/>
											{formState.externalLinkEnabled && formErrors.externalLink ? (
												<small style={{ color: "#b91c1c" }}>
													{formErrors.externalLink}
												</small>
											) : (
												<small>
													Users will be redirected to this URL when they tap the event card.
												</small>
											)}
										</div>
									</div>
								</div>
							</div>

							<div className="admin-dialog__footer">
								{dialogState.mode === "edit" ? (
									<button
										type="button"
										className="admin-button is-danger"
										onClick={handleDelete}
										disabled={isSubmitting || isDeleting}
										style={{ marginRight: "auto" }}
									>
										{isDeleting ? "Deleting…" : "Delete event"}
									</button>
								) : null}
								<button
									type="button"
									className="admin-button admin-button--ghost"
									onClick={closeDialog}
									disabled={isSubmitting || isDeleting}
								>
									Cancel
								</button>
								<button
									type="submit"
									className="admin-button is-primary"
									disabled={isSubmitting || isDeleting}
								>
									{isSubmitting
										? "Saving…"
										: dialogState.mode === "create"
										? "Create event"
										: "Save changes"}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</div>
	);
}
