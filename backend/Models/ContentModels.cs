namespace College.Api.Models;

public sealed class Notice
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string Body { get; init; }
    public required string Status { get; set; }
    public string Audience { get; init; } = "public";
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? PublishedAt { get; set; }
}

public sealed class AuditEntry
{
    public required string Action { get; init; }
    public required string NoticeId { get; init; }
    public required string Actor { get; init; }
    public required DateTimeOffset At { get; init; }
}

public sealed class ContentData
{
    public List<Notice> Notices { get; init; } = [];
    public List<AuditEntry> Audit { get; init; } = [];
}

public sealed record LoginRequest(string? Email, string? Password);
public sealed record CreateNoticeRequest(string? Title, string? Body);
