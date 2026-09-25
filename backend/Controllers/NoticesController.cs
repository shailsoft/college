using College.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace College.Api.Controllers;

[ApiController]
[Route("api/notices")]
public sealed class NoticesController(JsonContentStore store) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPublished()
    {
        var notices = await store.ReadAsync(data => data.Notices
            .Where(notice => notice.Status == "published")
            .OrderByDescending(notice => notice.PublishedAt)
            .ToList());
        return Ok(notices);
    }
}
