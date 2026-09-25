using College.Api.Models;
using College.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace College.Api.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin")]
public sealed class AdminNoticesController(JsonContentStore store) : ControllerBase
{
    [HttpGet("notices")]
    public async Task<IActionResult> GetAll() =>
        Ok(await store.ReadAsync(data => data.Notices));

    [HttpGet("audit")]
    public async Task<IActionResult> GetAudit() =>
        Ok(await store.ReadAsync(data => data.Audit.TakeLast(50).Reverse().ToList()));

    [HttpPost("notices")]
    public async Task<IActionResult> Create(CreateNoticeRequest request)
    {
        var title = request.Title?.Trim() ?? string.Empty;
        var body = request.Body?.Trim() ?? string.Empty;
        if (title.Length is < 5 or > 160 || body.Length is < 10 or > 5000)
            return BadRequest(new { error = "Title must be 5–160 characters and body 10–5000 characters" });

        var notice = new Notice
        {
            Id = Guid.NewGuid().ToString("N"),
            Title = title,
            Body = body,
            Status = "draft",
            CreatedAt = DateTimeOffset.UtcNow
        };

        await store.UpdateAsync(data =>
        {
            data.Notices.Add(notice);
            data.Audit.Add(new AuditEntry
            {
                Action = "notice.created",
                NoticeId = notice.Id,
                Actor = User.Identity!.Name!,
                At = DateTimeOffset.UtcNow
            });
            return notice;
        });

        return Created($"/api/admin/notices/{notice.Id}", notice);
    }

    [HttpPost("notices/{id}/publish")]
    public async Task<IActionResult> Publish(string id)
    {
        var outcome = await store.UpdateAsync(data =>
        {
            var notice = data.Notices.FirstOrDefault(item => item.Id == id);
            if (notice is null) return (Code: 404, Notice: (Notice?)null);
            if (notice.Status != "draft") return (Code: 409, Notice: notice);

            notice.Status = "published";
            notice.PublishedAt = DateTimeOffset.UtcNow;
            data.Audit.Add(new AuditEntry
            {
                Action = "notice.published",
                NoticeId = notice.Id,
                Actor = User.Identity!.Name!,
                At = DateTimeOffset.UtcNow
            });
            return (Code: 200, Notice: notice);
        });

        return outcome.Code switch
        {
            404 => NotFound(new { error = "Notice not found" }),
            409 => Conflict(new { error = "Only draft notices can be published" }),
            _ => Ok(outcome.Notice)
        };
    }
}
