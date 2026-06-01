# GOOGLE SHEET COLUMN HEADERS — COPY-PASTE REFERENCE
# For each tab, copy the header row exactly as shown.
# Headers are tab-separated for easy pasting into Google Sheets.

## Settings Tab — Row 1:
Key	Value

## Presenters Tab — Row 1:
ID	Name	Department	Email	PosterNumber	Track	CheckedIn	CheckInTime	Active	CreatedAt

## Judges Tab — Row 1:
ID	Name	Email	Token	TokenExpiry	TokenUsed	TokenUsedAt	AssignedTrack	AssignedPresenters	Active	CreatedAt	LastActivity

## Tracks Tab — Row 1:
TrackID	Name	Description	Color	Active

## Votes Tab — Row 1:
VoteID	Timestamp	PresenterID	PresenterName	VoterType	VoterID	VoterName	RubricCategoryID	Score	Comment	SessionToken	EventDay	IPHash

## Results Tab — Row 1:
PresenterID	Name	Department	Track	JudgeAvg	AudienceAvg	FinalScore	JudgeVoteCount	AudienceVoteCount	RubricBreakdown	OverallRank	TrackRank	CheckedIn	Active

## AuditLog Tab — Row 1:
LogID	Timestamp	Actor	ActorType	Action	EntityType	EntityID	Details	SessionToken	IPHash

## Templates Tab — Row 1:
TemplateID	Name	Description	Config	CreatedAt	CreatedBy


---
# APPS SCRIPT DEPLOYMENT SETTINGS (exact values)

Execute as: Me
Who has access: Anyone
Type: Web app
